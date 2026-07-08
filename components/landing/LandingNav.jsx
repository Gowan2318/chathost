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
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D7377] text-lg font-black text-white shadow-md">
            V
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1A1A2E]">
            Vesta<span className="text-[#0D7377]">Chat</span>Host
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-link-slide text-sm font-medium text-[#4A5568] transition hover:text-[#0D7377]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <a href="#demo" className="text-sm font-medium text-[#4A5568] transition hover:text-[#0D7377]">
            Live Demo
          </a>
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[#4A5568] transition hover:text-[#0D7377]"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg border border-[#0D7377] px-5 py-2.5 text-sm font-bold text-[#0D7377] transition hover:bg-[#E8F4F4]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[#4A5568] transition hover:text-[#0D7377]"
              >
                Log In
              </Link>
              <Link
                href="/builder"
                className="rounded-lg bg-[#0D7377] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0A5D61]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-[#1A1A2E] md:hidden"
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
        <nav className="border-t border-[#E2E8F0] bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium text-[#4A5568] hover:text-[#0D7377]"
              >
                {link.label}
              </a>
            ))}
            {!loading && user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="py-2 text-sm font-medium text-[#4A5568] hover:text-[#0D7377]"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => { signOut(); setOpen(false); }}
                  className="mt-2 rounded-lg border border-[#0D7377] py-3 text-center text-sm font-bold text-[#0D7377]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="py-2 text-sm font-medium text-[#4A5568] hover:text-[#0D7377]"
                >
                  Log In
                </Link>
                <Link
                  href="/builder"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg bg-[#0D7377] py-3 text-center text-sm font-bold text-white"
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
