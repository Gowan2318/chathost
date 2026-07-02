"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MascotCharacter from "./mascots/MascotCharacter";
import { shadeHex } from "../lib/color";
import { resolveChatTheme } from "../lib/chat-themes";

const BOOKING_PATTERN =
  /\b(book|booking|schedule|appointment|reserve|make an appointment)\b/i;
const PAYMENT_PATTERN =
  /\b(pay|payment|pricing|price|prices|cost|costs|how much|how to pay|fee|fees|quote)\b/i;
const TALK_TO_SOMEONE_PATTERN = /\btalk to someone\b/i;
const ACCEPTING_PATIENTS_PATTERN = /\b(accepting new patients|currently accepting)\b/i;
const AFFIRMATIVE_PATTERN = /^(yes|yeah|yep|sure|ok|okay|please|definitely|absolutely)\.?$/i;
const CONVERSATION_END_PATTERN = /Is there anything else|anything else I can|else I can help|help you with|Have a great day|Feel free to reach out|Hope that helps/i;

function buildContextualReplies(botText) {
  if (ACCEPTING_PATIENTS_PATTERN.test(botText)) {
    return ["Book an appointment"];
  }
  if (/\b(book|appointment)\b/i.test(botText) && /https?:\/\//.test(botText)) {
    return ["Yes, book now"];
  }
  return [];
}

function isBookingIntent(text) {
  return BOOKING_PATTERN.test(text);
}
function isPaymentIntent(text) {
  return PAYMENT_PATTERN.test(text);
}
function isTalkToSomeoneIntent(text) {
  return TALK_TO_SOMEONE_PATTERN.test(text);
}
function lastBotWasFollowUp(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      return CONVERSATION_END_PATTERN.test(messages[i].content);
    }
  }
  return false;
}

function TypingIndicator({ brandColor, theme }) {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3"
        style={{ backgroundColor: theme.botBubble }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full"
            style={{ backgroundColor: brandColor, animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatBubbleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
    </svg>
  );
}

function MessageContent({ msg, onStartNewChat, brandColor }) {
  return (
    <>
      <span className="whitespace-pre-line">{msg.content}</span>
      {msg.payButtonUrl && (
        <a
          href={msg.payButtonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: brandColor }}
        >
          Pay Now
        </a>
      )}
      {msg.bookButtonUrl && (
        <a
          href={msg.bookButtonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: brandColor }}
        >
          📅 Book Now
        </a>
      )}
      {msg.startNewChat && (
        <button
          type="button"
          onClick={onStartNewChat}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: brandColor }}
        >
          Start New Chat
        </button>
      )}
    </>
  );
}

const INDUSTRY_EXAMPLES = {
  restaurant: "'What's on your menu?' or 'Do you take reservations?'",
  dental: "'Are you accepting new patients?' or 'What insurance do you accept?'",
  salon: "'What services do you offer?' or 'Do you accept walk-ins?'",
  barber: "'What are your prices?' or 'Do you accept walk-ins?'",
  gym: "'What are your membership options?' or 'Do you offer a free trial?'",
  lawncare: "'Do you offer free estimates?' or 'What areas do you service?'",
  realestate: "'What areas do you serve?' or 'Are you accepting new clients?'",
  real_estate: "'What areas do you serve?' or 'Are you accepting new clients?'",
  law: "'What areas of law do you practice?' or 'Do you offer free consultations?'",
};

/**
 * @param {{
 *   config: object,
 *   defaultOpen?: boolean,
 *   embedded?: boolean,
 *   className?: string,
 * }}
 */
export default function ChatWidget({
  config,
  defaultOpen = false,
  embedded = false,
  className = "",
}) {
  const {
    businessName = "Your Business",
    businessInfo = "",
    supportPhone = "",
    supportEmail = "",
    payNowUrl = "",
    quickReplies = [],
    customQA = [],
    brandColor = "#059669",
    industry = "other",
    mascotName = "",
    chatTheme = "light",
  } = config;

  const bookingUrl = config.booking_url || config.bookingUrl || "";

  const displayMascotName = mascotName || businessName;
  const brandDark = shadeHex(brandColor, -25);
  const theme = resolveChatTheme(chatTheme, brandColor);

  const getSupportFallbackMessage = () =>
    `I want to make sure you get the best help! Please contact our team directly:
📞 ${supportPhone}
📧 ${supportEmail}
We're happy to assist you!`;

  const initialMessage = useMemo(
    () => ({
      role: "assistant",
      content: `Hi! I'm ${displayMascotName}, and I'm here to answer all your questions about ${businessName}. Feel free to ask me anything — for example, ${INDUSTRY_EXAMPLES[industry] || "'What services do you offer?' or 'How do I get in touch?'"}. What would you like to know? 😊`,
    }),
    [businessName, displayMascotName, industry]
  );

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [contextualReplies, setContextualReplies] = useState([]);
  const [mascotAnimation, setMascotAnimation] = useState("idle");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const reShowTimerRef = useRef(null);

  useEffect(() => {
    setMessages([initialMessage]);
    setShowQuickReplies(true);
    setInput("");
    setContextualReplies([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, businessInfo, supportPhone, supportEmail]);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMascotAnimation("bounce");
      const t = setTimeout(() => setMascotAnimation("idle"), 800);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isTyping) setMascotAnimation("thinking");
    else if (mascotAnimation === "thinking") setMascotAnimation("idle");
  }, [isTyping, mascotAnimation]);

  const triggerCelebrate = useCallback(() => {
    setMascotAnimation("celebrate");
    const t = setTimeout(() => setMascotAnimation("idle"), 2000);
    return () => clearTimeout(t);
  }, []);

  const addAssistantMessage = useCallback((content, extra = {}) => {
    setMessages((prev) => [...prev, { role: "assistant", content, ...extra }]);
  }, []);

  const resetToStart = useCallback(() => {
    if (reShowTimerRef.current) {
      clearTimeout(reShowTimerRef.current);
      reShowTimerRef.current = null;
    }
    setMessages([initialMessage]);
    setShowQuickReplies(true);
    setInput("");
    setContextualReplies([]);
  }, [initialMessage]);

  const handleBooking = useCallback(() => {
    if (bookingUrl) {
      addAssistantMessage(
        "I'd love to help you schedule! Click below to see our available times and book instantly 📅",
        { bookButtonUrl: bookingUrl }
      );
    } else {
      addAssistantMessage(
        `To book an appointment please call us at ${supportPhone} or email ${supportEmail}`
      );
    }
  }, [bookingUrl, supportPhone, supportEmail, addAssistantMessage]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    if (reShowTimerRef.current) {
      clearTimeout(reShowTimerRef.current);
      reShowTimerRef.current = null;
    }
    setContextualReplies([]);

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowQuickReplies(false);

    if (isBookingIntent(trimmed)) {
      handleBooking();
      return;
    }
    if (isTalkToSomeoneIntent(trimmed)) {
      addAssistantMessage(getSupportFallbackMessage());
      return;
    }

    const qaAnswer = qaAnswerMap[trimmed.toLowerCase()];
    if (qaAnswer) {
      addAssistantMessage(qaAnswer);
      return;
    }

    if (AFFIRMATIVE_PATTERN.test(trimmed) && lastBotWasFollowUp(messages)) {
      addAssistantMessage("Of course! Here's what I can help you with:");
      setShowQuickReplies(true);
      return;
    }

    const nextMessages = [...messages, userMessage];
    setIsTyping(true);
    try {
      const effectiveBusinessInfo =
        bookingUrl && !businessInfo.includes(bookingUrl)
          ? `${businessInfo}. To book an appointment online: ${bookingUrl}`
          : businessInfo;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, businessName, businessInfo: effectiveBusinessInfo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");

      const payButtonUrl = payNowUrl && isPaymentIntent(data.message) ? payNowUrl : undefined;
      setMessages((prev) => [...prev, { role: "assistant", content: data.message, payButtonUrl }]);
      setContextualReplies(buildContextualReplies(data.message));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong on our end. Please try again in a moment." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  function handleContextualReply(label) {
    if (isTyping) return;
    setContextualReplies([]);
    if (label === "Book an appointment" || label === "Yes, book now") {
      setMessages((prev) => [...prev, { role: "user", content: label }]);
      setShowQuickReplies(false);
      handleBooking();
    } else {
      sendMessage(label);
    }
  }

  const inputPlaceholder = "Type your message…";

  const qaAnswerMap = Object.fromEntries(
    (Array.isArray(customQA) ? customQA : [])
      .filter((qa) => qa?.question?.trim() && qa?.answer?.trim())
      .map((qa) => [qa.question.trim().toLowerCase(), qa.answer.trim()])
  );
  const allButtons = [
    ...quickReplies.filter(Boolean),
    ...(Array.isArray(customQA) ? customQA : [])
      .filter((qa) => qa?.question?.trim())
      .map((qa) => qa.question.trim()),
  ].slice(0, 8);
  const positionClass = embedded
    ? "relative flex flex-col items-stretch"
    : "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4";

  return (
    <div className={`vesta-chat-widget-root ${positionClass} ${className}`}>
      {isOpen && (
        <div
          className={`flex flex-col overflow-hidden rounded-2xl border shadow-2xl ${
            embedded
              ? "h-[480px] w-full shadow-black/20"
              : "h-[min(520px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2rem))] shadow-black/30"
          } ${theme.glass && embedded ? "backdrop-blur-xl" : ""}`}
          style={{
            background: theme.chatBackground,
            borderColor: theme.panelBorder,
            ...(theme.glass
              ? { backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }
              : {}),
          }}
          role="dialog"
          aria-label={`Chat with ${businessName}`}
        >
          <header
            className="flex items-center justify-between px-4 py-3.5 text-white"
            style={{ background: `linear-gradient(to right, ${brandColor}, ${brandDark})` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25">
                <MascotCharacter industry={industry} animation={mascotAnimation} size={40} />
              </div>
              <div>
                <h2 className="text-sm font-semibold leading-tight">{businessName}</h2>
                <p className="text-xs text-white/90">
                  {displayMascotName !== businessName ? `${displayMascotName} · ` : ""}
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToStart}
                className="rounded px-1.5 py-0.5 text-xs text-white/60 transition hover:text-white/90"
              >
                ↩ Start Over
              </button>
              <button
                type="button"
                onClick={() => { resetToStart(); setIsOpen(false); }}
                className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/20"
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4"
            style={{ background: theme.messagesArea }}
          >
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={`${msg.role}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user" ? "rounded-br-md" : "rounded-bl-md shadow-sm"
                    }`}
                    style={
                      msg.role === "user"
                        ? { backgroundColor: theme.userBubble, color: theme.userText }
                        : {
                            backgroundColor: theme.botBubble,
                            color: theme.botText,
                            border: `1px solid ${theme.panelBorder}`,
                            ...(theme.glass ? { textShadow: "0 1px 3px rgba(0,0,0,0.5)" } : {}),
                          }
                    }
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <MessageContent
                        msg={msg}
                        onStartNewChat={resetToStart}
                        brandColor={brandColor}
                      />
                    )}
                  </div>
                </div>
              ))}
              {isTyping && <TypingIndicator brandColor={brandColor} theme={theme} />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {contextualReplies.length > 0 && (
            <div
              className="grid grid-cols-2 gap-2 border-t p-3"
              style={{
                background: theme.quickReplyBackground,
                borderColor: theme.footerBorder,
              }}
            >
              {contextualReplies.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleContextualReply(label)}
                  disabled={isTyping}
                  className="rounded-xl border px-3 py-2.5 text-left text-xs font-medium leading-snug transition disabled:opacity-50"
                  style={{
                    borderColor: `${brandColor}35`,
                    backgroundColor: `${brandColor}10`,
                    color: shadeHex(brandColor, theme.quickReplyShade ?? -50),
                    ...(theme.glass ? { textShadow: "0 1px 3px rgba(0,0,0,0.5)" } : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {showQuickReplies && contextualReplies.length === 0 && allButtons.length > 0 && (
            <div
              className="border-t p-3"
              style={{
                background: theme.quickReplyBackground,
                borderColor: theme.footerBorder,
              }}
            >
              <p className="mb-2 text-[11px] font-medium" style={{ color: theme.botText, opacity: 0.55 }}>
                Quick questions:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {allButtons.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => sendMessage(label)}
                    disabled={isTyping}
                    className="rounded-xl border px-3 py-2.5 text-left text-xs font-medium leading-snug transition disabled:opacity-50"
                    style={{
                      borderColor: `${brandColor}35`,
                      backgroundColor: `${brandColor}10`,
                      color: shadeHex(brandColor, -50),
                      ...(theme.glass ? { textShadow: "0 1px 3px rgba(0,0,0,0.5)" } : {}),
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-end gap-2 border-t p-3"
            style={{
              background: theme.footerBackground,
              borderColor: theme.footerBorder,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isTyping}
              className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-offset-0 disabled:opacity-60"
              style={{
                borderColor: theme.panelBorder,
                backgroundColor: theme.inputBackground,
                color: theme.inputText,
                caretColor: theme.inputText,
                colorScheme: chatTheme === "light" ? "light" : "dark",
                ...(theme.glass ? { backdropFilter: "blur(8px)" } : {}),
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: brandColor }}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className={`flex items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 active:scale-95 ${
            embedded ? "absolute bottom-4 right-4 h-14 w-14" : "h-14 w-14"
          }`}
          style={{
            background: `linear-gradient(to bottom right, ${brandColor}, ${brandDark})`,
            boxShadow: `0 10px 25px ${brandColor}40`,
          }}
          aria-label="Open chat"
          aria-expanded={isOpen}
        >
          <span className="flex items-center justify-center">
            <MascotCharacter industry={industry} animation={mascotAnimation} size={36} />
          </span>
        </button>
      )}
    </div>
  );
}
