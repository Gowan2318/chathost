"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── White-label config (edit per client) ───────────────────────────────────
const BUSINESS_NAME = "GreenLeaf Support";
const BUSINESS_INFO =
  "GreenLeaf is an eco-friendly home services company offering lawn care, landscaping, and seasonal cleanups. Hours: Mon–Fri 8am–6pm, Sat 9am–2pm. Phone: (555) 123-4567. Email: hello@greenleaf.example.";
const PAY_NOW_URL = "https://example.com/pay";
const SUPPORT_PHONE = "(555) 123-4567";
const SUPPORT_EMAIL = "hello@greenleaf.example";

/** Quick reply shortcuts (max 8). Edit per client; shown in a 2-column grid until the user sends a message. */
const QUICK_REPLIES = [
  "What are your hours?",
  "How do I book an appointment?",
  "What services do you offer?",
  "What are your prices?",
  "Do you accept insurance?",
  "Where are you located?",
  "How do I pay?",
  "Talk to someone",
];
// ─────────────────────────────────────────────────────────────────────────────

const PRICING_INFO = `Here's how our pricing works:

• Basic lawn care — $45 per visit
• Full landscaping — from $150
• Seasonal cleanup — from $89

You can pay securely online after your service is scheduled.`;

const BOOKING_PATTERN =
  /\b(book|booking|schedule|appointment|reserve|make an appointment)\b/i;
const PAYMENT_PATTERN =
  /\b(pay|payment|pricing|price|prices|cost|costs|how much|how to pay|fee|fees|quote)\b/i;
const TALK_TO_SOMEONE_PATTERN = /\btalk to someone\b/i;
const UNHELPFUL_AI_PATTERN =
  /\b(i(?:'m| am) not sure|i don(?:'t| not) know|cannot help|can't help|can not help|unable to help|please contact us|please call us|reach out to us|contact us directly|call us directly|don't have (?:that |those )?information|do not have (?:that |those )?information|outside (?:of )?my (?:knowledge|ability)|not able to (?:help|answer)|unable to (?:answer|assist))\b/i;

const getSupportFallbackMessage = () =>
  `I want to make sure you get the best help! Please contact our team directly:
📞 ${SUPPORT_PHONE}
📧 ${SUPPORT_EMAIL}
We're happy to assist you!`;

const FOLLOW_UP_PROMPT =
  "Is there anything else I can help you with today? 😊";

const getClosingMessage = () =>
  `Thank you for contacting ${BUSINESS_NAME}! We look forward to serving you. Have a wonderful day! 😊`;

const INITIAL_MESSAGE = {
  role: "assistant",
  content: `Hi there! 👋 Welcome to ${BUSINESS_NAME}. How can I help you today?`,
};

function isBookingIntent(text) {
  return BOOKING_PATTERN.test(text);
}

function isPaymentIntent(text) {
  return PAYMENT_PATTERN.test(text);
}

function isTalkToSomeoneIntent(text) {
  return TALK_TO_SOMEONE_PATTERN.test(text);
}

function needsSupportFallback(text) {
  return UNHELPFUL_AI_PATTERN.test(text);
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-emerald-50 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-7 w-7"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.164-.096l-2.165-3.24a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
    </svg>
  );
}

function MessageContent({
  msg,
  showFollowUpButtons,
  onFollowUpYes,
  onFollowUpNo,
  onStartNewChat,
}) {
  return (
    <>
      <span className="whitespace-pre-line">{msg.content}</span>
      {msg.payButtonUrl && (
        <a
          href={msg.payButtonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Pay Now
        </a>
      )}
      {msg.followUp && showFollowUpButtons && (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onFollowUpYes}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            Yes, I have another question
          </button>
          <button
            type="button"
            onClick={onFollowUpNo}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
          >
            No, I&apos;m all set
          </button>
        </div>
      )}
      {msg.startNewChat && (
        <button
          type="button"
          onClick={onStartNewChat}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Start New Chat
        </button>
      )}
    </>
  );
}

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [bookingStep, setBookingStep] = useState(null);
  const [bookingData, setBookingData] = useState({
    name: "",
    date: "",
    phone: "",
  });
  const [awaitingFollowUp, setAwaitingFollowUp] = useState(false);
  const [chatClosed, setChatClosed] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const addAssistantMessage = useCallback((content, extra = {}) => {
    setMessages((prev) => [...prev, { role: "assistant", content, ...extra }]);
  }, []);

  const completeWithFollowUp = useCallback(
    (content, extra = {}) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content, ...extra },
        { role: "assistant", content: FOLLOW_UP_PROMPT, followUp: true },
      ]);
      setAwaitingFollowUp(true);
    },
    []
  );

  const resetToStart = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setShowQuickReplies(true);
    setBookingStep(null);
    setBookingData({ name: "", date: "", phone: "" });
    setAwaitingFollowUp(false);
    setChatClosed(false);
    setInput("");
  }, []);

  const handleFollowUpYes = () => {
    resetToStart();
  };

  const handleFollowUpNo = () => {
    setAwaitingFollowUp(false);
    setChatClosed(true);
    addAssistantMessage(getClosingMessage(), { startNewChat: true });
  };

  const cancelBooking = () => {
    setBookingStep(null);
    setBookingData({ name: "", date: "", phone: "" });
    addAssistantMessage(
      "No problem — I've cancelled the booking. How else can I help you today?"
    );
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping || awaitingFollowUp || chatClosed) return;

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowQuickReplies(false);

    if (bookingStep === "name") {
      setBookingData((d) => ({ ...d, name: trimmed }));
      setBookingStep("date");
      addAssistantMessage("Great! What date works best for you?");
      return;
    }

    if (bookingStep === "date") {
      setBookingData((d) => ({ ...d, date: trimmed }));
      setBookingStep("phone");
      addAssistantMessage("Thanks! What's the best phone number to reach you?");
      return;
    }

    if (bookingStep === "phone") {
      const confirmed = { ...bookingData, phone: trimmed };
      setBookingStep(null);
      setBookingData({ name: "", date: "", phone: "" });
      completeWithFollowUp(
        `You're all set, ${confirmed.name}! We've scheduled your visit for ${confirmed.date}. We'll call you at ${confirmed.phone} if we need anything else. See you then!`
      );
      return;
    }

    if (isBookingIntent(trimmed)) {
      setBookingData({ name: "", date: "", phone: "" });
      setBookingStep("name");
      addAssistantMessage(
        "I'd be happy to help you book an appointment! Let's start with your full name."
      );
      return;
    }

    if (isPaymentIntent(trimmed)) {
      completeWithFollowUp(PRICING_INFO, { payButtonUrl: PAY_NOW_URL });
      return;
    }

    if (isTalkToSomeoneIntent(trimmed)) {
      completeWithFollowUp(getSupportFallbackMessage());
      return;
    }

    const nextMessages = [...messages, userMessage];
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          businessName: BUSINESS_NAME,
          businessInfo: BUSINESS_INFO,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      const assistantReplies = [{ role: "assistant", content: data.message }];
      if (needsSupportFallback(data.message)) {
        assistantReplies.push({
          role: "assistant",
          content: getSupportFallbackMessage(),
        });
      }
      setMessages((prev) => [
        ...prev,
        ...assistantReplies,
        { role: "assistant", content: FOLLOW_UP_PROMPT, followUp: true },
      ]);
      setAwaitingFollowUp(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong on our end. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = (text) => {
    sendMessage(text);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const inputPlaceholder = chatClosed
    ? "Chat ended"
    : awaitingFollowUp
      ? "Choose an option above…"
      : bookingStep === "name"
        ? "Your full name…"
        : bookingStep === "date"
          ? "Preferred date (e.g. March 15)…"
          : bookingStep === "phone"
            ? "Your phone number…"
            : "Type your message…";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <main className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-4 inline-block rounded-full bg-emerald-100 px-4 py-1 text-sm font-medium text-emerald-800">
          White-label AI chat
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
          {BUSINESS_NAME}
        </h1>
        <p className="mt-4 max-w-lg text-lg leading-relaxed text-emerald-800/80">
          Professional support powered by AI. Click the chat button in the
          bottom-right corner to get started.
        </p>
      </main>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        {isOpen && (
          <div
            className="flex h-[min(520px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-900/10"
            role="dialog"
            aria-label={`Chat with ${BUSINESS_NAME}`}
          >
            <header className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3.5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                  {BUSINESS_NAME.charAt(0)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-tight">
                    {BUSINESS_NAME}
                  </h2>
                  <p className="flex items-center gap-1.5 text-xs text-emerald-100">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-300" />
                    </span>
                    Online
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/20"
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4">
              <div className="flex flex-col gap-3">
                {messages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}`}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-br-md bg-emerald-600 text-white"
                          : "rounded-bl-md border border-emerald-100 bg-white text-slate-700 shadow-sm"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <MessageContent
                          msg={msg}
                          showFollowUpButtons={awaitingFollowUp}
                          onFollowUpYes={handleFollowUpYes}
                          onFollowUpNo={handleFollowUpNo}
                          onStartNewChat={resetToStart}
                        />
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {showQuickReplies && !bookingStep && !awaitingFollowUp && !chatClosed && (
              <div className="grid grid-cols-2 gap-2 border-t border-emerald-50 bg-white p-3">
                {QUICK_REPLIES.slice(0, 8).map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleQuickReply(label)}
                    disabled={isTyping}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-xs font-medium leading-snug text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {bookingStep && !awaitingFollowUp && !chatClosed && (
              <div className="border-t border-emerald-50 bg-white px-3 py-2.5">
                <button
                  type="button"
                  onClick={cancelBooking}
                  disabled={isTyping}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                >
                  Start Over
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 border-t border-emerald-100 bg-white p-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputPlaceholder}
                disabled={isTyping || awaitingFollowUp || chatClosed}
                className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={
                  !input.trim() || isTyping || awaitingFollowUp || chatClosed
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-600/30 transition hover:scale-105 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-95"
          aria-label={isOpen ? "Close chat" : "Open chat"}
          aria-expanded={isOpen}
        >
          {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
        </button>
      </div>
    </div>
  );
}
