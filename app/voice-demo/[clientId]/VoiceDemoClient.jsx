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

export default function VoiceDemoClient({ assistantId, businessName }) {
  // idle -> connecting -> live -> ended | error
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(MAX_CALL_SECONDS);

  const vapiRef = useRef(null);
  const countdownRef = useRef(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  // Lazily creates the Vapi client on first use — avoids loading the WebRTC
  // stack or prompting for mic access before the visitor actually opts in.
  async function getVapiClient() {
    if (vapiRef.current) return vapiRef.current;

    const { default: Vapi } = await import("@vapi-ai/web");
    // avoidEval: true tells Daily's underlying call engine to skip eval()-based
    // code paths, so our CSP can grant it 'wasm-unsafe-eval' (WebAssembly only)
    // instead of the much broader 'unsafe-eval' — see the comment on cspHeader
    // in next.config.ts.
    const vapi = new Vapi(publicKey, undefined, { avoidEval: true });

    vapi.on("call-start", () => {
      setStatus("live");
      setRemainingSeconds(MAX_CALL_SECONDS);
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

  return (
    <div className="mt-8 flex flex-col items-center gap-4">
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
    </div>
  );
}
