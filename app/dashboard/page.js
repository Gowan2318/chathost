"use client";

// Placeholder dashboard — Phase 3 will add embed code display, config editing, and subscription management.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-[#a3a3a3]">
        Loading…
      </div>
    );
  }

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

      <header className="relative z-10 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-lg font-black text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20">
              V
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Vesta<span className="text-[#D4AF37]">Chat</span>Host
            </span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-[#D4AF37]/40 px-4 py-2 text-sm font-semibold text-[#F0D060] transition hover:bg-[#D4AF37]/10"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Welcome back, <span className="text-[#D4AF37]">{user.email}</span>
        </h1>
        <p className="mt-4 text-[#a3a3a3]">
          Your account is active. More features are coming in Phase 3.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Embed Code", body: "Get the script tag to add your chatbot to any website.", soon: true },
            { title: "Configure Bot", body: "Update your business info, mascot, and quick replies.", soon: true },
            { title: "Subscription", body: "Manage your plan and billing details.", soon: true },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-8"
            >
              <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">{card.body}</p>
              {card.soon && (
                <span className="mt-4 inline-block rounded-full bg-[#D4AF37]/15 px-3 py-1 text-xs font-semibold text-[#F0D060]">
                  Coming in Phase 3
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
