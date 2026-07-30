"use client";

import { useEffect, useRef, useState } from "react";

// COST SAFETY: every second of a web call bills Vapi (LLM + transcription +
// voice), same as a phone call. This is a server-enforced cap passed to
// vapi.start() as an assistantOverride — Vapi itself ends the call at this
// duration, not just client-side JS — so a left-open tab (or a client that
// never receives the timer callback) still can't run past 5 minutes.
const MAX_CALL_SECONDS = 300;

function formatMMSS(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

// Transcript lines live only in this component's React state — never sent
// anywhere but rendered in the browser, and wiped on unmount/new call. See
// TranscriptPanel below for the render side of this.
function TranscriptPanel({ lines, partial, businessName, visible }) {
  const scrollRef = useRef(null);

  // Auto-scroll to the newest line whenever a final line lands or a partial
  // line's text grows, but only if the visitor hasn't scrolled up to read
  // back — checked via a small threshold so a deliberate scroll-up isn't
  // fought on every transcript update.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines, partial]);

  if (!visible) return null;

  const hasPartial = partial.role && partial.text;
  const isEmpty = lines.length === 0 && !hasPartial;

  return (
    <div className="mt-6 w-full text-left">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#4A5568]">
        Live transcript
      </p>
      <div
        ref={scrollRef}
        className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-3 sm:max-h-80"
      >
        {isEmpty && (
          <p className="py-6 text-center text-sm italic text-[#4A5568]/70">
            Listening for the conversation…
          </p>
        )}

        {lines.map((line) => (
          <TranscriptBubble
            key={line.id}
            role={line.role}
            text={line.text}
            businessName={businessName}
          />
        ))}

        {hasPartial && (
          <TranscriptBubble
            role={partial.role}
            text={partial.text}
            businessName={businessName}
            pending
          />
        )}
      </div>
    </div>
  );
}

function TranscriptBubble({ role, text, businessName, pending }) {
  const isUser = role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <span className="mb-0.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-[#4A5568]/60">
        {isUser ? "You" : businessName}
      </span>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
          isUser
            ? "rounded-br-sm bg-[#0D7377] text-white"
            : "rounded-bl-sm border border-[#E2E8F0] bg-white text-[#1A1A2E]",
          pending ? "opacity-60 italic" : "",
        ].join(" ")}
      >
        {text}
      </div>
    </div>
  );
}

export default function VoiceDemoClient({ assistantId, businessName }) {
  // idle -> connecting -> live -> ended | error
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(MAX_CALL_SECONDS);
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [partialTranscript, setPartialTranscript] = useState({ role: null, text: "" });

  const vapiRef = useRef(null);
  const countdownRef = useRef(null);
  const lineIdRef = useRef(0);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  // Handles every Vapi "message" event and picks out transcript messages.
  // Confirmed against node_modules/@vapi-ai/web's shipped types
  // (api.ts: ServerMessageTranscript) rather than guessed: the client SDK's
  // generic 'message' event (vapi.on("message", ...)) fires for every
  // server message forwarded over Daily's data channel, and transcript
  // messages always carry `type: "transcript"` (the "transcript[transcriptType=
  // 'final']" variant in the type union is a *server-webhook* filter option,
  // not a value the client SDK ever emits) with a separate
  // `transcriptType: "partial" | "final"` field, plus `role: "assistant" | "user"`
  // and `transcript: <string>`. Both the assistant's spoken lines and the
  // user's transcribed speech arrive through this same event.
  function handleVapiMessage(message) {
    if (!message || message.type !== "transcript") return;
    const { role, transcriptType, transcript } = message;
    if (!role || typeof transcript !== "string") return;

    if (transcriptType === "final") {
      const text = transcript.trim();
      if (!text) return;
      lineIdRef.current += 1;
      setTranscriptLines((prev) => [...prev, { id: lineIdRef.current, role, text }]);
      setPartialTranscript((prev) => (prev.role === role ? { role: null, text: "" } : prev));
    } else if (transcriptType === "partial") {
      setPartialTranscript({ role, text: transcript });
    }
  }

  // Lazily creates the Vapi client on first use — avoids loading the WebRTC
  // stack or prompting for mic access before the visitor actually opts in.
  async function getVapiClient() {
    if (vapiRef.current) return vapiRef.current;

    const { default: Vapi } = await import("@vapi-ai/web");
    // Plain default init (no avoidEval) — avoidEval was added in the previous CSP
    // pass to keep 'unsafe-eval' out of prod, but Daily's own docs describe it as
    // "an optional workaround...not a general recommendation," validated only for
    // their video virtual-background feature. Every call since it was added showed
    // zero user speech reaching Vapi despite the assistant's own audio working fine
    // — a one-way audio-publish failure. Reverted to Daily's documented default
    // (script-src now allows 'unsafe-eval' instead) since that's the well-tested
    // path for the audio-publish pipeline.
    const vapi = new Vapi(publicKey);
    // No audioSource/videoSource override needed — the Vapi/Daily default is
    // audioSource: true (use the mic already granted by the browser permission
    // prompt), confirmed by reading the SDK's own source
    // (node_modules/@vapi-ai/web/dist/vapi.js: `audioSource: this.dailyCallObject.audioSource ?? true`).
    // Nothing here mutes or withholds the local track.

    vapi.on("call-start", () => {
      setStatus("live");
      setRemainingSeconds(MAX_CALL_SECONDS);
      // Fresh transcript for every new call — nothing from a previous call
      // on this page lingers.
      setTranscriptLines([]);
      setPartialTranscript({ role: null, text: "" });
      clearCountdown();
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearCountdown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    vapi.on("call-end", () => {
      clearCountdown();
      setStatus("ended");
    });

    vapi.on("message", handleVapiMessage);

    vapi.on("error", (err) => {
      clearCountdown();
      console.error("Voice demo error:", err);
      setErrorMessage(
        err?.errorMsg || err?.message || "Something interrupted the call. Please try again."
      );
      setStatus("error");
    });

    vapiRef.current = vapi;
    return vapi;
  }

  async function handleStart() {
    if (!publicKey) {
      setErrorMessage("Voice demo isn't configured yet — missing public key.");
      setStatus("error");
      return;
    }

    setErrorMessage("");
    setStatus("connecting");
    try {
      const vapi = await getVapiClient();
      // maxDurationSeconds is enforced by Vapi's servers, independent of
      // anything happening (or not) in this browser tab.
      await vapi.start(assistantId, { maxDurationSeconds: MAX_CALL_SECONDS });
    } catch (err) {
      clearCountdown();
      console.error("Voice demo failed to start:", err);
      setErrorMessage("Couldn't connect. Please check your microphone permissions and try again.");
      setStatus("error");
    }
  }

  function handleEnd() {
    vapiRef.current?.stop();
  }

  // Ends any in-progress call if the visitor navigates away or closes the tab.
  useEffect(() => {
    return () => {
      clearCountdown();
      vapiRef.current?.stop();
    };
  }, []);

  const showTranscript = status === "live" || status === "ended";

  return (
    <div className="mt-8 flex w-full flex-col items-center gap-4">
      {status === "idle" && (
        <button
          onClick={handleStart}
          className="w-full rounded-xl bg-[#0D7377] px-6 py-4 text-lg font-bold text-white shadow-lg shadow-[#0D7377]/30 transition hover:bg-[#0A5D61] active:scale-[0.98]"
        >
          📞 Talk to your AI receptionist
        </button>
      )}

      {status === "connecting" && (
        <button
          disabled
          className="w-full cursor-not-allowed rounded-xl bg-[#0D7377]/60 px-6 py-4 text-lg font-bold text-white"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Connecting…
          </span>
        </button>
      )}

      {status === "live" && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-[#E8F4F4] px-4 py-2 text-sm font-semibold text-[#0D7377]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Live — {formatMMSS(remainingSeconds)} remaining
          </div>
          <p className="text-sm text-[#4A5568]">
            Speak naturally, just like calling {businessName} on the phone.
          </p>
          <button
            onClick={handleEnd}
            className="w-full rounded-xl border-2 border-[#1A1A2E]/10 bg-white px-6 py-3 text-base font-bold text-[#1A1A2E] transition hover:bg-[#F8F9FA]"
          >
            End Call
          </button>
        </div>
      )}

      {status === "ended" && (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-sm font-medium text-[#4A5568]">Call ended. How did it sound?</p>
          <button
            onClick={handleStart}
            className="w-full rounded-xl bg-[#0D7377] px-6 py-4 text-lg font-bold text-white shadow-lg shadow-[#0D7377]/30 transition hover:bg-[#0A5D61] active:scale-[0.98]"
          >
            📞 Talk again
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          <button
            onClick={handleStart}
            className="w-full rounded-xl bg-[#0D7377] px-6 py-4 text-lg font-bold text-white shadow-lg shadow-[#0D7377]/30 transition hover:bg-[#0A5D61] active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      )}

      <TranscriptPanel
        lines={transcriptLines}
        partial={partialTranscript}
        businessName={businessName}
        visible={showTranscript}
      />
    </div>
  );
}
