"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so consent is checked post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const choose = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#0D7377]/20 bg-white px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm leading-relaxed text-[#1A1A2E]">
          We use essential cookies to keep you logged in and make the site work. By continuing, you
          agree to our{" "}
          <Link href="/privacy" className="text-[#0D7377] underline hover:text-[#0A5D61]">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="rounded-lg border border-[#0D7377]/30 px-4 py-2 text-sm font-semibold text-[#1A1A2E] transition hover:bg-[#F8F9FA]"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-lg bg-[#0D7377] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A5D61]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
