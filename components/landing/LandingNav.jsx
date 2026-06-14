"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../lib/AuthContext";

const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-lg font-black text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20">
            V
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Vesta<span className="text-[#D4AF37]">Chat</span>Host
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#a3a3a3] transition hover:text-[#F0D060]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <a href="#demo" className="text-sm font-medium text-[#a3a3a3] transition hover:text-white">
            Live Demo
          </a>
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[#a3a3a3] transition hover:text-[#F0D060]"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full border border-[#D4AF37]/40 px-5 py-2.5 text-sm font-bold text-[#F0D060] transition hover:bg-[#D4AF37]/10"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[#a3a3a3] transition hover:text-[#F0D060]"
              >
                Log In
              </Link>
              <Link
                href="/builder"
                className="rounded-full bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/25 transition hover:bg-[#F0D060]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-white md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/5 bg-[#111111] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium text-[#a3a3a3] hover:text-[#F0D060]"
              >
                {link.label}
              </a>
            ))}
            {!loading && user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="py-2 text-sm font-medium text-[#a3a3a3] hover:text-[#F0D060]"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => { signOut(); setOpen(false); }}
                  className="mt-2 rounded-full border border-[#D4AF37]/40 py-3 text-center text-sm font-bold text-[#F0D060]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="py-2 text-sm font-medium text-[#a3a3a3] hover:text-[#F0D060]"
                >
                  Log In
                </Link>
                <Link
                  href="/builder"
                  className="mt-2 rounded-full bg-[#D4AF37] py-3 text-center text-sm font-bold text-[#0A0A0A]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
