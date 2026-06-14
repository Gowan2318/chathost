"use client";

import { useState } from "react";
import { buildEmbedCode } from "../lib/chatbot-config";

export default function EmbedCodeCard({ clientId }) {
  const [copied, setCopied] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [copyError, setCopyError] = useState("");

  const embedCode = buildEmbedCode(clientId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Could not copy. Please copy it manually.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-[#1A1A1A]">
        <button
          type="button"
          onClick={() => setInstallHelpOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-[#D4AF37]/5"
          aria-expanded={installHelpOpen}
        >
          <span className="text-sm font-semibold text-[#F0D060]">
            Need help installing this?
          </span>
          <span
            className={`shrink-0 text-[#D4AF37] transition-transform ${installHelpOpen ? "rotate-180" : ""}`}
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
                <span className="font-medium text-white">WordPress:</span> Use a
                plugin like &quot;Insert Headers and Footers&quot; and paste the
                code in the footer section
              </li>
              <li>
                <span className="font-medium text-white">Wix:</span> Go to
                Settings &gt; Custom Code &gt; Add Code to Footer
              </li>
              <li>
                <span className="font-medium text-white">Squarespace:</span> Go
                to Settings &gt; Advanced &gt; Code Injection &gt; Footer
              </li>
              <li>
                <span className="font-medium text-white">Shopify:</span> Go to
                Online Store &gt; Themes &gt; Edit Code &gt; theme.liquid, paste
                before <code className="text-[#F0D060]">&lt;/body&gt;</code>
              </li>
              <li>
                <span className="font-medium text-white">Other/Custom site:</span>{" "}
                Send this code to your web developer and ask them to add it
                before the closing{" "}
                <code className="text-[#F0D060]">&lt;/body&gt;</code> tag
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#1A1A1A] p-6">
        <p className="text-sm font-semibold text-[#F0D060]">Your embed code</p>
        <p className="mt-2 text-xs text-[#a3a3a3]">
          Paste this snippet before the closing{" "}
          <code className="text-[#F0D060]">&lt;/body&gt;</code> tag on your
          website.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <pre className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-[#0A0A0A] p-4 text-left text-xs leading-relaxed text-[#F0D060]">
            {embedCode}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-xl border border-[#D4AF37]/40 px-4 py-2.5 text-sm font-semibold text-[#F0D060] transition hover:bg-[#D4AF37]/10"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {copyError && <p className="mt-3 text-sm text-red-400">{copyError}</p>}
      </div>
    </div>
  );
}
