"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vestachathost_waitlist_emails";
const LAUNCH_MS = 30 * 24 * 60 * 60 * 1000;

function pad(n) {
  return String(n).padStart(2, "0");
}

function GoldParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + 7) % 100}%`,
        top: `${(i * 23 + 11) % 100}%`,
        size: 3 + (i % 4),
        delay: `${(i % 8) * 0.7}s`,
        duration: `${4 + (i % 5)}s`,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle absolute rounded-full bg-[#D4AF37]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[100px]" />
    </div>
  );
}

export default function ComingSoonPage() {
  const launchDate = useMemo(() => new Date(Date.now() + LAUNCH_MS), []);
  const [now, setNow] = useState(() => Date.now());
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, launchDate.getTime() - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining / 3600000) % 24);
  const minutes = Math.floor((remaining / 60000) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const emails = Array.isArray(list) ? list : [];
      if (!emails.includes(trimmed)) {
        emails.push(trimmed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
      }
      setSubmitted(true);
      setEmail("");
    } catch {
      setError("Could not save your email. Please try again.");
    }
  };

  return (
    <>
      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.15; }
          50% { transform: translateY(-28px) translateX(12px); opacity: 0.55; }
        }
        .particle {
          animation: particle-float ease-in-out infinite;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.45);
        }
      `}</style>

      <div className="relative min-h-screen overflow-hidden bg-[#0A0A0A] text-white">
        <GoldParticles />

        <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-10 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-xl font-black text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/25">
              V
            </span>
            <span className="text-2xl font-bold tracking-tight">
              Vesta<span className="text-[#D4AF37]">Chat</span>Host
            </span>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Launching soon
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            Something Amazing is Coming
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#a3a3a3] sm:text-lg">
            We&apos;re putting the finishing touches on VestaChatHost. Be the first to know when
            we launch.
          </p>

          <div className="mt-10 grid w-full max-w-lg grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Days", value: pad(days) },
              { label: "Hours", value: pad(hours) },
              { label: "Minutes", value: pad(minutes) },
              { label: "Seconds", value: pad(seconds) },
            ].map((unit) => (
              <div
                key={unit.label}
                className="rounded-2xl border border-[#D4AF37]/30 bg-[#1A1A1A]/90 px-2 py-4 backdrop-blur-sm sm:px-3"
              >
                <p className="text-2xl font-bold tabular-nums text-[#F0D060] sm:text-3xl">
                  {unit.value}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#a3a3a3] sm:text-xs">
                  {unit.label}
                </p>
              </div>
            ))}
          </div>

          {submitted ? (
            <div className="mt-10 w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-6 py-5">
              <p className="text-lg font-semibold text-[#F0D060]">Thank you! 🎉</p>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                You&apos;re on the list. We&apos;ll notify you the moment VestaChatHost goes live.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 text-xs text-[#D4AF37] underline-offset-2 hover:underline"
              >
                Add another email
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="flex-1 rounded-xl border border-white/10 bg-[#111111] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/20"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#D4AF37] px-8 py-3.5 text-sm font-bold text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20 transition hover:bg-[#F0D060]"
              >
                Notify Me
              </button>
            </form>
          )}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </main>
      </div>
    </>
  );
}
