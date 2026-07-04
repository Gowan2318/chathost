"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { INDUSTRY_LABELS } from "../../lib/industries";
import { PLAN_PRICE } from "../../lib/admin-stats";
import AdminSidebar, { MenuIcon } from "../../components/admin/AdminSidebar";
import { Logo } from "../../components/dashboard/DashboardSidebar";

const PLAN_LABELS = { basic: "Basic", pro: "Pro" };

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

const STATUS_TEXT_COLORS = {
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

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ClientsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <circle cx="9" cy="8" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.75 19.25a6.25 6.25 0 0112.5 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 5.1a3.25 3.25 0 010 6.3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.25 13.1a6.25 6.25 0 015 6.15" />
    </svg>
  );
}

function RevenueIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.75v18.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.25 6.5h-5.75a2.75 2.75 0 000 5.5h3a2.75 2.75 0 010 5.5H7"
      />
    </svg>
  );
}

function MessagesIcon(props) {
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

function AverageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.25h16.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 19.25v-5.5M12 19.25v-9M17 19.25v-3.5" />
    </svg>
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

function ClientActions({ client, pending, onAction }) {
  const isPending = pending === client.clientId;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {client.stripeCustomerId ? (
        <a
          href={`https://dashboard.stripe.com/customers/${client.stripeCustomerId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#0D7377] hover:text-[#0A5D61]"
        >
          View in Stripe ↗
        </a>
      ) : (
        <span className="text-[#9CA3AF]">—</span>
      )}

      {(client.status === "active" || client.status === "trialing") && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAction(client, "pause")}
          className="font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50"
        >
          Pause
        </button>
      )}
      {client.status === "paused" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAction(client, "resume")}
          className="font-semibold text-green-600 hover:text-green-700 disabled:opacity-50"
        >
          Resume
        </button>
      )}
      {client.status !== "canceled" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onAction(client, "cancel")}
          className="font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
      {isPending && <span className="text-xs text-[#9CA3AF]">Working…</span>}
    </div>
  );
}

export default function AdminDashboardClient({ email, stats, fetchError }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingClientId, setPendingClientId] = useState(null);
  const [actionError, setActionError] = useState("");

  const {
    clients,
    totalClients,
    monthlyRevenue,
    totalMessages,
    avgMessages,
    basicActive,
    proActive,
    alerts,
  } = stats;

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  async function handleClientAction(client, action) {
    if (action === "cancel") {
      const confirmed = window.confirm(
        `Are you sure you want to cancel ${client.businessName}'s subscription? This will stop their chatbot and attempt to cancel their Stripe subscription.`
      );
      if (!confirmed) return;
    }

    setActionError("");
    setPendingClientId(client.clientId);

    try {
      const res = await fetch("/api/admin/manage-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.clientId, action }),
      });
      const json = await res.json();

      if (!res.ok) {
        setActionError(json.error || "Action failed. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      setActionError("Action failed. Please try again.");
    } finally {
      setPendingClientId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <AdminSidebar email={email} onSignOut={handleSignOut} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
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
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Founder Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1A1A2E] sm:text-3xl">Business Overview</h1>

          {fetchError && (
            <p className="mt-4 text-sm text-red-600">
              Some client data failed to load. Numbers below may be incomplete.
            </p>
          )}

          <div className="mt-8 space-y-8">
            {/* Top stats row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<ClientsIcon className="h-4 w-4" />}
                label="Total Clients"
                value={totalClients.toLocaleString()}
                sub="Active subscriptions"
              />
              <StatCard
                icon={<RevenueIcon className="h-4 w-4" />}
                label="Monthly Revenue"
                value={`$${monthlyRevenue.toLocaleString()}`}
                sub="MRR from active clients"
              />
              <StatCard
                icon={<MessagesIcon className="h-4 w-4" />}
                label="Messages This Month"
                value={totalMessages.toLocaleString()}
                sub="Across all active clients"
              />
              <StatCard
                icon={<AverageIcon className="h-4 w-4" />}
                label="Avg Messages / Client"
                value={avgMessages.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                sub="Active clients only"
              />
            </div>

            {/* Clients table */}
            <div id="clients" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Clients</p>

              {actionError && (
                <p className="mt-4 rounded-xl border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {actionError}
                </p>
              )}

              {clients.length === 0 ? (
                <p className="mt-6 text-sm text-[#4A5568]">No chatbots yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[840px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        <th className="py-2 pr-4">Business</th>
                        <th className="py-2 pr-4">Industry</th>
                        <th className="py-2 pr-4">Plan</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Messages</th>
                        <th className="py-2 pr-4">Billing Date</th>
                        <th className="py-2 pr-4">Joined</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c) => (
                        <tr key={c.clientId} className="border-b border-[#E2E8F0] last:border-0">
                          <td className="py-3 pr-4 font-semibold text-[#1A1A2E]">{c.businessName}</td>
                          <td className="py-3 pr-4 text-[#4A5568]">{INDUSTRY_LABELS[c.industry] || "Other"}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-block rounded-full bg-[#0D7377]/10 px-2.5 py-0.5 text-xs font-bold text-[#0D7377]">
                              {PLAN_LABELS[c.plan]}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[c.status] ?? "bg-gray-400"}`} />
                              <span className={STATUS_TEXT_COLORS[c.status] ?? "text-[#9CA3AF]"}>
                                {STATUS_LABELS[c.status] ?? c.status}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-[#4A5568]">
                            {c.messagesUsed.toLocaleString()} / {c.messageLimit.toLocaleString()}
                          </td>
                          <td className="py-3 pr-4 text-[#4A5568]">{formatDate(c.currentPeriodEnd)}</td>
                          <td className="py-3 pr-4 text-[#4A5568]">{formatDate(c.createdAt)}</td>
                          <td className="py-3 pr-4">
                            <ClientActions client={c} pending={pendingClientId} onAction={handleClientAction} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Revenue breakdown */}
            <div id="revenue" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Revenue Breakdown</p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#F8F9FA] px-4 py-3">
                  <p className="text-sm text-[#4A5568]">
                    Basic plan: <span className="font-semibold text-[#1A1A2E]">{basicActive}</span> clients ×{" "}
                    <span className="font-semibold text-[#1A1A2E]">${PLAN_PRICE.basic}</span>
                  </p>
                  <p className="font-bold text-[#1A1A2E]">${(basicActive * PLAN_PRICE.basic).toLocaleString()}/mo</p>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#F8F9FA] px-4 py-3">
                  <p className="text-sm text-[#4A5568]">
                    Pro plan: <span className="font-semibold text-[#1A1A2E]">{proActive}</span> clients ×{" "}
                    <span className="font-semibold text-[#1A1A2E]">${PLAN_PRICE.pro}</span>
                  </p>
                  <p className="font-bold text-[#1A1A2E]">${(proActive * PLAN_PRICE.pro).toLocaleString()}/mo</p>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#0D7377]/10 px-4 py-3">
                  <p className="text-sm font-semibold text-[#0D7377]">Total MRR</p>
                  <p className="text-lg font-bold text-[#0D7377]">${monthlyRevenue.toLocaleString()}/mo</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-[#9CA3AF]">
                Note: figures above use list price — some clients may be on a FOUNDING20 20% discount, so actual
                billed revenue may be lower.
              </p>
            </div>

            {/* Usage alerts */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Usage Alerts</p>

              {alerts.length === 0 ? (
                <p className="mt-4 text-sm text-[#4A5568]">No clients are approaching their message limit.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {alerts.map((c) => {
                    const atLimit = c.usagePct >= 100;
                    return (
                      <div
                        key={c.clientId}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                          atLimit ? "bg-red-50" : "bg-amber-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#1A1A2E]">{c.businessName}</p>
                        <p className={`text-sm font-bold ${atLimit ? "text-red-600" : "text-amber-600"}`}>
                          {c.messagesUsed.toLocaleString()} / {c.messageLimit.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
