"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildEmbedCode } from "../../lib/chatbot-config";

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
  const [copied, setCopied] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [loadError, setLoadError] = useState("");

  const embedCode = clientId ? buildEmbedCode(clientId) : "";

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
      .catch(() => {
        setLoadError("Could not load your chatbot configuration.");
      });
  }, [clientId]);

  const handleCopyEmbed = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLoadError("Could not copy embed code. Please copy it manually.");
    }
  };

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

            <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-[#1A1A1A]/90 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setInstallHelpOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-[#D4AF37]/5"
                aria-expanded={installHelpOpen}
              >
                <span className="text-sm font-semibold text-[#F0D060]">
                  Need help installing this?
                </span>
                <span
                  className={`shrink-0 text-[#D4AF37] transition-transform ${
                    installHelpOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  ▼
                </span>
              </button>
              {installHelpOpen && (
                <div className="border-t border-white/10 px-6 pb-6 pt-4">
                  <p className="text-sm text-[#a3a3a3]">
                    If you&apos;re not sure how to add this to your website:
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#a3a3a3]">
                    <li>
                      <span className="font-medium text-white">WordPress:</span> Use a plugin like
                      &quot;Insert Headers and Footers&quot; and paste the code in the footer
                      section
                    </li>
                    <li>
                      <span className="font-medium text-white">Wix:</span> Go to Settings &gt;
                      Custom Code &gt; Add Code to Footer
                    </li>
                    <li>
                      <span className="font-medium text-white">Squarespace:</span> Go to Settings
                      &gt; Advanced &gt; Code Injection &gt; Footer
                    </li>
                    <li>
                      <span className="font-medium text-white">Shopify:</span> Go to Online Store
                      &gt; Themes &gt; Edit Code &gt; theme.liquid, paste before{" "}
                      <code className="text-[#F0D060]">&lt;/body&gt;</code>
                    </li>
                    <li>
                      <span className="font-medium text-white">Other/Custom site:</span> Send this
                      code to your web developer and ask them to add it before the closing{" "}
                      <code className="text-[#F0D060]">&lt;/body&gt;</code> tag
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#1A1A1A]/90 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-[#F0D060]">Your embed code</p>
              <p className="mt-2 text-xs text-[#a3a3a3]">
                Paste this snippet before the closing{" "}
                <code className="text-[#F0D060]">&lt;/body&gt;</code> tag on your website.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                <pre className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-[#0A0A0A] p-4 text-left text-xs leading-relaxed text-[#F0D060]">
                  {embedCode}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  className="shrink-0 rounded-xl border border-[#D4AF37]/40 px-4 py-2.5 text-sm font-semibold text-[#F0D060] transition hover:bg-[#D4AF37]/10"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              {loadError && <p className="mt-3 text-sm text-red-400">{loadError}</p>}
            </div>
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
