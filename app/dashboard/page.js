"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext";
import { getSupabaseClient } from "../../lib/supabase";
import { INDUSTRY_LABELS } from "../../lib/industries";
import { VOICE_PLANS, isValidVoicePlan, chatMessageLimitFor, nextPlanUp } from "../../lib/plans";
import EmbedCodeCard from "../../components/EmbedCodeCard";
import MascotCharacter from "../../components/mascots/MascotCharacter";
import DashboardSidebar, { Logo, MenuIcon, CardIcon, HelpIcon } from "../../components/dashboard/DashboardSidebar";

function formatBillingDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// current_period_end is only populated once Stripe's webhook has run — until
// then (or if it's ever missing) fall back to the first of next month so the
// UI always has a reset date to show instead of nothing.
function firstOfNextMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
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

const STATUS_DOT_COLORS = {
  active: "bg-green-500",
  trialing: "bg-green-500",
  past_due: "bg-yellow-500",
  unpaid: "bg-yellow-500",
  canceled: "bg-red-500",
  incomplete_expired: "bg-red-500",
  inactive: "bg-gray-400",
  paused: "bg-gray-400",
  incomplete: "bg-gray-400",
};

function ChatBubbleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a8 8 0 01-11.5 7.2L4 20l1.1-3.9A8 8 0 1121 12z"
      />
    </svg>
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

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[#0D7377]">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <div className="mt-3 text-2xl font-bold text-[#1A1A2E]">{value}</div>
      {sub && <p className="mt-1 text-xs text-[#4A5568]">{sub}</p>}
    </div>
  );
}

function UsageDonut({ used, limit }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const ringColor = pct >= 100 ? "#DC2626" : pct >= 80 ? "#D97706" : "#0D7377";

  return (
    <svg viewBox="0 0 176 176" className="h-44 w-44 shrink-0">
      <circle cx="88" cy="88" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="18" />
      <circle
        cx="88"
        cy="88"
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth="18"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform="rotate(-90 88 88)"
      />
      <text x="88" y="83" textAnchor="middle" className="fill-[#1A1A2E] text-2xl font-bold">
        {used.toLocaleString()}
      </text>
      <text x="88" y="104" textAnchor="middle" className="fill-[#4A5568] text-sm">
        / {limit.toLocaleString()}
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { user, loading, signOut, isFounder } = useAuth();
  const router = useRouter();
  const [chatbot, setChatbot] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Deliberately not falling back to config?.plan — that's the builder's
  // "basic"/"pro" config-complexity toggle, a different axis from the
  // billing plan that happens to share the string "pro" (see the same note
  // in app/api/chat/route.js).
  const rawPlan = chatbot?.plan;
  const plan = isValidVoicePlan(rawPlan) ? rawPlan : null;
  // 0 (not null) when unresolved — keeps every arithmetic/.toLocaleString()
  // use below crash-safe while a chatbot row waits on its first Stripe payment.
  const messageLimit = plan ? chatMessageLimitFor(plan) : 0;
  const messagesUsed = chatbot?.monthly_message_count ?? 0;
  const messagesRemaining = Math.max(0, messageLimit - messagesUsed);
  const usagePct = messageLimit > 0 ? (messagesUsed / messageLimit) * 100 : 0;
  const planLabel = plan ? VOICE_PLANS[plan].label : "Pending";
  const upgradeTo = plan ? nextPlanUp(plan) : null;

  // Always show a reset date — fall back to the first of next month until
  // Stripe's webhook has populated current_period_end.
  const resetDateSource = chatbot?.current_period_end ?? firstOfNextMonthIso();
  const nextBillingDate = formatBillingDate(resetDateSource);
  const resetShortLabel = formatShortDate(resetDateSource);

  const statusLabel = STATUS_LABELS[chatbot?.subscription_status] ?? chatbot?.subscription_status ?? "—";
  const statusColor = STATUS_COLORS[chatbot?.subscription_status] ?? "text-[#9CA3AF]";
  const statusDotColor = STATUS_DOT_COLORS[chatbot?.subscription_status] ?? "bg-gray-400";

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <DashboardSidebar email={user.email} isFounder={isFounder} onSignOut={handleSignOut} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-[#1A1A2E] hover:bg-[#F8F9FA]"
            aria-label="Open menu"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            Welcome back{config?.businessName ? `, ${config.businessName}` : ""}
          </h1>

          {fetchLoading && (
            <p className="mt-12 text-[#4A5568]">Loading your chatbot…</p>
          )}

          {fetchError && (
            <p className="mt-12 text-red-600">{fetchError}</p>
          )}

          {!fetchLoading && !fetchError && !chatbot && <EmptyState />}

          {!fetchLoading && !fetchError && chatbot && config && (
            <div className="mt-8 space-y-6">
              {/* Top stats row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  icon={<ChatBubbleIcon className="h-4 w-4" />}
                  label="Messages Used"
                  value={messagesUsed.toLocaleString()}
                  sub={`/ ${messageLimit.toLocaleString()} this month`}
                />
                <StatCard
                  icon={<CardIcon className="h-4 w-4" />}
                  label="Plan"
                  value={
                    <span className="inline-block rounded-full bg-[#0D7377]/10 px-3 py-0.5 text-lg font-bold text-[#0D7377]">
                      {planLabel}
                    </span>
                  }
                  sub={resetShortLabel ? `Resets ${resetShortLabel}` : null}
                />
                <StatCard
                  icon={<HelpIcon className="h-4 w-4" />}
                  label="Status"
                  value={
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusDotColor}`} />
                      <span className={statusColor}>{statusLabel}</span>
                    </span>
                  }
                  sub={null}
                />
              </div>

              {/* Usage chart */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                  Message Usage
                </p>
                <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                  <UsageDonut used={messagesUsed} limit={messageLimit} />
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-[#4A5568]">
                      <span className="font-semibold text-[#1A1A2E]">
                        {messagesRemaining.toLocaleString()}
                      </span>{" "}
                      messages remaining
                    </p>
                    <p className="mt-1 text-sm text-[#4A5568]">
                      Resets on <span className="font-semibold text-[#1A1A2E]">{nextBillingDate}</span>
                    </p>
                    {usagePct >= 100 ? (
                      <p className="mt-3 inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                        Limit reached — upgrade to continue
                      </p>
                    ) : usagePct >= 80 ? (
                      <p className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                        Approaching limit
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                    Your Embed Code
                  </p>
                  <EmbedCodeCard clientId={chatbot.client_id} />
                </div>

                <div className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                    Configure Bot
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <MascotCharacter
                      industry={config.industry || "other"}
                      animation="idle"
                      size={64}
                    />
                    <div>
                      <h3 className="text-lg font-bold text-[#1A1A2E]">{config.businessName}</h3>
                      <p className="text-sm text-[#4A5568]">
                        {INDUSTRY_LABELS[config.industry] || "Business"}
                      </p>
                      <p className="text-sm text-[#0D7377]">{config.mascotName || "Your Mascot"}</p>
                    </div>
                  </div>
                  {config.websiteUrl && (
                    <a
                      href={config.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs text-[#0D7377] transition hover:text-[#0A5D61]"
                    >
                      {config.websiteUrl} ↗
                    </a>
                  )}
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-[#4A5568]">
                    Update your business info, hours, mascot, quick replies, and branding.
                  </p>
                  <Link
                    href="/dashboard/edit"
                    className="mt-5 inline-block rounded-xl border border-[#0D7377]/40 px-5 py-2.5 text-center text-sm font-semibold text-[#0D7377] transition hover:bg-[#0D7377]/10"
                  >
                    Edit Settings
                  </Link>
                </div>
              </div>

              {/* Subscription */}
              <div id="subscription" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                    Subscription
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
                    <span className={statusColor}>{statusLabel}</span>
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
                      Current Plan
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#1A1A2E]">{planLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
                      Next Billing Date
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#1A1A2E]">{nextBillingDate}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#4A5568]">
                  Update payment method, view invoices, or cancel your plan through the Stripe portal.
                </p>
                {portalError && (
                  <p className="mt-2 text-xs text-red-600">{portalError}</p>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  {chatbot.stripe_customer_id ? (
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="rounded-xl border border-[#0D7377]/40 px-5 py-2.5 text-center text-sm font-semibold text-[#0D7377] transition hover:bg-[#0D7377]/10 disabled:opacity-60"
                    >
                      {portalLoading ? "Opening…" : "Manage Subscription"}
                    </button>
                  ) : (
                    <div className="space-y-2">
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

                  {upgradeTo && (
                    <Link
                      href="/demo-request"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0D7377] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-[#0D7377]/20 transition hover:bg-[#0A5D61]"
                    >
                      Contact us to upgrade to {VOICE_PLANS[upgradeTo].label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
