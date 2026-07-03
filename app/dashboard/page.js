"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext";
import { getSupabaseClient } from "../../lib/supabase";
import { INDUSTRY_LABELS } from "../../lib/industries";
import { PLAN_LIMITS } from "../../lib/plans";
import EmbedCodeCard from "../../components/EmbedCodeCard";
import MascotCharacter from "../../components/mascots/MascotCharacter";

const PRO_CHECKOUT_URL = "https://buy.stripe.com/00w28qcIsbDp4jMgEbdfG01";

const PLAN_LABELS = { basic: "Basic", pro: "Pro" };

function formatBillingDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DashboardHeader({ email, onSignOut }) {
  return (
    <header className="border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D7377] to-[#14A3A8] text-lg font-black text-white shadow-lg shadow-[#0D7377]/20">
            V
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1A1A2E]">
            Vesta<span className="text-[#0D7377]">Chat</span>Host
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#4A5568] sm:block">{email}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-[#0D7377]/40 px-4 py-2 text-sm font-semibold text-[#0D7377] transition hover:bg-[#0D7377]/10"
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
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0D7377]/10">
        <svg
          className="h-10 w-10 text-[#0D7377]"
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
      <h2 className="mt-6 text-2xl font-bold text-[#1A1A2E]">
        You haven&apos;t built a chatbot yet
      </h2>
      <p className="mt-3 max-w-sm text-[#4A5568]">
        Set up your AI chatbot in about 15 minutes. We&apos;ll walk you through every step.
      </p>
      <Link
        href="/builder"
        className="mt-8 rounded-xl bg-[#0D7377] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#0D7377]/20 transition hover:bg-[#0A5D61]"
      >
        Build Your Chatbot
      </Link>
    </div>
  );
}

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  past_due: "Past due",
  canceled: "Canceled",
  trialing: "Trialing",
  unpaid: "Unpaid",
  paused: "Paused",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
};

const STATUS_COLORS = {
  active: "text-green-600",
  trialing: "text-green-600",
  past_due: "text-yellow-600",
  unpaid: "text-yellow-600",
  canceled: "text-red-600",
  incomplete_expired: "text-red-600",
  inactive: "text-[#9CA3AF]",
  paused: "text-[#9CA3AF]",
  incomplete: "text-[#9CA3AF]",
};

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [chatbot, setChatbot] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

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

  async function handleManageSubscription() {
    setPortalError("");
    setPortalLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ client_id: chatbot.client_id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPortalError(json.error || "Could not open subscription portal.");
        return;
      }
      window.location.assign(json.url);
    } catch {
      setPortalError("Could not open subscription portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-[#4A5568]">
        Loading…
      </div>
    );
  }

  const config = chatbot?.config ?? null;

  const plan = (chatbot?.plan ?? config?.plan) === "pro" ? "pro" : "basic";
  const messageLimit = PLAN_LIMITS[plan];
  const messagesUsed = chatbot?.monthly_message_count ?? 0;
  const nextBillingDate = formatBillingDate(chatbot?.current_period_end);
  const upgradeUrl = (() => {
    const url = new URL(PRO_CHECKOUT_URL);
    if (chatbot?.client_id) url.searchParams.set("client_reference_id", chatbot.client_id);
    if (user?.email) url.searchParams.set("prefilled_email", user.email);
    return url.toString();
  })();

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <DashboardHeader email={user.email} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
          Welcome back
        </h1>

        {fetchLoading && (
          <p className="mt-12 text-[#4A5568]">Loading your chatbot…</p>
        )}

        {fetchError && (
          <p className="mt-12 text-red-600">{fetchError}</p>
        )}

        {!fetchLoading && !fetchError && !chatbot && <EmptyState />}

        {!fetchLoading && !fetchError && chatbot && config && (
          <div className="mt-10 space-y-6">
            {/* Summary card */}
            <div className="flex flex-col gap-6 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <MascotCharacter
                  industry={config.industry || "other"}
                  animation="idle"
                  size={80}
                />
                <p className="text-sm font-medium text-[#0D7377]">
                  {config.mascotName || "Your Mascot"}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#0D7377]">
                  Your Chatbot
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#1A1A2E]">
                  {config.businessName}
                </h2>
                <p className="mt-1 text-sm text-[#4A5568]">
                  {INDUSTRY_LABELS[config.industry] || "Business"}{" "}
                  <span className={`font-medium ${STATUS_COLORS[chatbot.subscription_status] ?? "text-[#9CA3AF]"}`}>
                    · {STATUS_LABELS[chatbot.subscription_status] ?? chatbot.subscription_status ?? "—"}
                  </span>
                </p>
                {config.websiteUrl && (
                  <a
                    href={config.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[#0D7377] transition hover:text-[#0A5D61]"
                  >
                    {config.websiteUrl} ↗
                  </a>
                )}
              </div>
            </div>

            {/* Embed code */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                Embed Code
              </p>
              <EmbedCodeCard clientId={chatbot.client_id} />
            </div>

            {/* Usage & billing */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                  Usage & Billing
                </p>
                <span className="rounded-full bg-[#0D7377]/10 px-3 py-1 text-xs font-bold text-[#0D7377]">
                  {PLAN_LABELS[plan]} Plan
                </span>
              </div>

              <p className="mt-4 text-sm text-[#4A5568]">
                <span className="font-semibold text-[#1A1A2E]">
                  {messagesUsed.toLocaleString()} / {messageLimit.toLocaleString()}
                </span>{" "}
                messages used this month
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className="h-full rounded-full bg-[#0D7377]"
                  style={{ width: `${Math.min(100, (messagesUsed / messageLimit) * 100)}%` }}
                />
              </div>

              {nextBillingDate && (
                <p className="mt-3 text-sm text-[#4A5568]">
                  Next billing date: <span className="font-semibold text-[#1A1A2E]">{nextBillingDate}</span>
                </p>
              )}

              {plan === "basic" && (
                <a
                  href={upgradeUrl}
                  className="mt-5 inline-block rounded-xl bg-[#0D7377] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-[#0D7377]/20 transition hover:bg-[#0A5D61]"
                >
                  Upgrade to Pro — 1,500 messages/mo
                </a>
              )}
            </div>

            {/* Action cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Configure bot */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                    Configure Bot
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A5568]">
                    Update your business info, hours, mascot, quick replies, and
                    branding.
                  </p>
                </div>
                <Link
                  href="/dashboard/edit"
                  className="mt-5 inline-block rounded-xl border border-[#0D7377]/40 px-5 py-2.5 text-center text-sm font-semibold text-[#0D7377] transition hover:bg-[#0D7377]/10"
                >
                  Edit Settings
                </Link>
              </div>

              {/* Subscription */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                    Subscription
                  </p>
                  <p className="mt-1.5 text-sm text-[#4A5568]">
                    Status:{" "}
                    <span className={`font-semibold ${STATUS_COLORS[chatbot.subscription_status] ?? "text-[#1A1A2E]"}`}>
                      {STATUS_LABELS[chatbot.subscription_status] ?? chatbot.subscription_status ?? "—"}
                    </span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A5568]">
                    Update payment method, view invoices, or cancel your plan through the Stripe portal.
                  </p>
                  {portalError && (
                    <p className="mt-2 text-xs text-red-600">{portalError}</p>
                  )}
                </div>

                {chatbot.stripe_customer_id ? (
                  <button
                    type="button"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="mt-5 rounded-xl border border-[#0D7377]/40 px-5 py-2.5 text-center text-sm font-semibold text-[#0D7377] transition hover:bg-[#0D7377]/10 disabled:opacity-60"
                  >
                    {portalLoading ? "Opening…" : "Manage Subscription"}
                  </button>
                ) : (
                  <div className="mt-5 space-y-2">
                    <p className="text-xs text-[#9CA3AF]">
                      Subscription linking pending — if you have paid, the portal link will appear shortly.
                    </p>
                    <a
                      href="mailto:support@vestachathost.com?subject=Manage%20my%20VestaChatHost%20subscription"
                      className="inline-block rounded-xl border border-[#E2E8F0] px-5 py-2.5 text-center text-sm font-semibold text-[#4A5568] transition hover:bg-[#F8F9FA]"
                    >
                      Contact Support
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
