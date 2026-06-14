"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmbedCodeCard from "../../components/EmbedCodeCard";

const STEPS = [
  {
    step: "1",
    title: "Build your chatbot in the builder (15 minutes)",
  },
  {
    step: "2",
    title: "Copy your embed code",
  },
  {
    step: "3",
    title: "Paste it on your website",
  },
  {
    step: "4",
    title: "Your AI assistant goes live!",
  },
];

function SuccessContent() {
  const searchParams = useSearchParams();
  const clientId =
    searchParams.get("client_id") || searchParams.get("client_reference_id");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    if (!clientId) return;

    fetch(`/api/widget?id=${encodeURIComponent(clientId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load config");
        return res.json();
      })
      .then((config) => {
        setBusinessName(config.businessName || "");
      })
      .catch(() => {});
  }, [clientId]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0A] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#D4AF37]/10 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[120px]"
        aria-hidden
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <Link href="/" className="mb-10 flex items-center gap-3 transition hover:opacity-90">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-xl font-black text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/25">
            V
          </span>
          <span className="text-2xl font-bold tracking-tight">
            Vesta<span className="text-[#D4AF37]">Chat</span>Host
          </span>
        </Link>

        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F0D060] shadow-xl shadow-[#D4AF37]/30">
          <svg
            className="h-10 w-10 text-[#0A0A0A]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
          Welcome to VestaChatHost! 🎉
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#a3a3a3] sm:text-lg">
          Your payment was successful.
          {businessName ? ` ${businessName} is ready to go live!` : " Let's get your chatbot live!"}
        </p>

        {clientId ? (
          <div className="mt-10 w-full max-w-md space-y-4 text-left">
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#1A1A1A]/90 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-[#D4AF37]">What does this code do?</p>
              <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">
                This single line of code adds your AI chatbot to your website. Once you paste it,
                a chat bubble will appear in the bottom right corner of your site — visitors can
                click it to ask questions, book appointments, and get help, 24/7. It works on any
                website builder including WordPress, Wix, Squarespace, Shopify, and custom sites.
              </p>
            </div>
            <EmbedCodeCard clientId={clientId} />
          </div>
        ) : (
          <p className="mt-10 text-sm text-[#a3a3a3]">
            Missing client ID. Please contact{" "}
            <a href="mailto:support@vestachathost.com" className="text-[#D4AF37]">
              support@vestachathost.com
            </a>
            .
          </p>
        )}

        <div className="mt-14 w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A]/90 p-8 text-left backdrop-blur-sm">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">
            What&apos;s next
          </p>
          <ol className="space-y-5">
            {STEPS.map((item) => (
              <li key={item.step} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-sm font-bold text-[#F0D060]">
                  {item.step}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-[#a3a3a3] sm:text-base">
                  <span className="font-medium text-white">Step {item.step}:</span> {item.title}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-12 text-sm text-[#a3a3a3]">
          Need help?{" "}
          <a
            href="mailto:support@vestachathost.com"
            className="font-medium text-[#D4AF37] transition hover:text-[#F0D060]"
          >
            support@vestachathost.com
          </a>
        </p>
      </main>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-[#a3a3a3]">
          Loading...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
