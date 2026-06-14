"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext";
import { getSupabaseClient } from "../../lib/supabase";
import { INDUSTRY_LABELS } from "../../lib/industries";
import EmbedCodeCard from "../../components/EmbedCodeCard";
import MascotCharacter from "../../components/mascots/MascotCharacter";

function DashboardHeader({ email, onSignOut }) {
  return (
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
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#a3a3a3] sm:block">{email}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-[#D4AF37]/40 px-4 py-2 text-sm font-semibold text-[#F0D060] transition hover:bg-[#D4AF37]/10"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#D4AF37]/10">
        <svg
          className="h-10 w-10 text-[#D4AF37]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-2xl font-bold text-white">
        You haven&apos;t built a chatbot yet
      </h2>
      <p className="mt-3 max-w-sm text-[#a3a3a3]">
        Set up your AI chatbot in about 15 minutes. We&apos;ll walk you through every step.
      </p>
      <Link
        href="/builder"
        className="mt-8 rounded-xl bg-[#D4AF37] px-8 py-3 text-sm font-bold text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20 transition hover:bg-[#F0D060]"
      >
        Build Your Chatbot
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [chatbot, setChatbot] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    supabase
      .from("chatbots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          setFetchError("Could not load your chatbot. Please refresh.");
        } else {
          setChatbot(data?.[0] ?? null);
        }
        setFetchLoading(false);
      });
  }, [user]);

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

  const config = chatbot?.config ?? null;

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

      <DashboardHeader email={user.email} onSignOut={handleSignOut} />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Welcome back
        </h1>

        {fetchLoading && (
          <p className="mt-12 text-[#a3a3a3]">Loading your chatbot…</p>
        )}

        {fetchError && (
          <p className="mt-12 text-red-400">{fetchError}</p>
        )}

        {!fetchLoading && !fetchError && !chatbot && <EmptyState />}

        {!fetchLoading && !fetchError && chatbot && config && (
          <div className="mt-10 space-y-6">
            {/* Summary card */}
            <div className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <MascotCharacter
                  industry={config.industry || "other"}
                  animation="idle"
                  size={80}
                />
                <p className="text-sm font-medium text-[#F0D060]">
                  {config.mascotName || "Your Mascot"}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
                  Your Chatbot
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {config.businessName}
                </h2>
                <p className="mt-1 text-sm text-[#a3a3a3]">
                  {INDUSTRY_LABELS[config.industry] || "Business"} · Active subscription
                </p>
                {config.websiteUrl && (
                  <a
                    href={config.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[#D4AF37] transition hover:text-[#F0D060]"
                  >
                    {config.websiteUrl} ↗
                  </a>
                )}
              </div>
            </div>

            {/* Embed code */}
            <div className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">
                Embed Code
              </p>
              <EmbedCodeCard clientId={chatbot.client_id} />
            </div>

            {/* Action cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Configure bot */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#1A1A1A] p-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">
                    Configure Bot
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">
                    Update your business info, hours, mascot, quick replies, and
                    branding.
                  </p>
                </div>
                <Link
                  href="/dashboard/edit"
                  className="mt-5 inline-block rounded-xl border border-[#D4AF37]/40 px-5 py-2.5 text-center text-sm font-semibold text-[#F0D060] transition hover:bg-[#D4AF37]/10"
                >
                  Edit Settings
                </Link>
              </div>

              {/* Subscription */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-[#1A1A1A] p-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">
                    Subscription
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#a3a3a3]">
                    Active subscription · Need to make changes to your plan or
                    billing? Contact our team.
                  </p>
                </div>
                {/* Phase 4: replace with Stripe Customer Portal link */}
                <a
                  href="mailto:support@vestachathost.com?subject=Manage%20my%20VestaChatHost%20subscription"
                  className="mt-5 inline-block rounded-xl border border-[#D4AF37]/40 px-5 py-2.5 text-center text-sm font-semibold text-[#F0D060] transition hover:bg-[#D4AF37]/10"
                >
                  Manage Subscription
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
