"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/AuthContext";
import DashboardSidebar, { Logo, MenuIcon } from "../../../components/dashboard/DashboardSidebar";

function formatShortDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatLongDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Avoids a misleading "+100%" (or worse, a divide-by-zero) when last month
// had no activity at all — shows encouragement instead of a raw percentage.
function formatComparison(thisMonth, lastMonth) {
  if (thisMonth === 0 && lastMonth === 0) return null;
  if (lastMonth === 0) return { text: "New this month", positive: true };

  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  return {
    text: `${pct >= 0 ? "+" : ""}${pct}% vs last month`,
    positive: pct >= 0,
  };
}

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

function CursorClickIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l3.5 15L12 13l6 2.5L6 4z" />
    </svg>
  );
}

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <rect x="3.25" y="4.75" width="17.5" height="15.5" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.25 9.25h17.5M8 3v3M16 3v3" />
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

function StatCard({ icon, label, value, sub, comparison }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[#0D7377]">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <div className="mt-3 text-2xl font-bold text-[#1A1A2E]">{value}</div>
      {comparison && (
        <p className={`mt-1 text-xs font-semibold ${comparison.positive ? "text-green-600" : "text-red-600"}`}>
          {comparison.text}
        </p>
      )}
      {sub && !comparison && <p className="mt-1 text-xs text-[#4A5568]">{sub}</p>}
    </div>
  );
}

function ActivityChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.conversations, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8F9FA] py-16 text-center">
        <p className="text-sm font-medium text-[#4A5568]">
          No conversations yet — share your chatbot to get started!
        </p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.conversations), 1);
  const slotWidth = 300 / data.length;
  const barWidth = slotWidth * 0.6;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
        <span>{max}</span>
        <span className="uppercase tracking-widest">Conversations / day</span>
      </div>
      <svg viewBox="0 0 300 110" preserveAspectRatio="none" className="mt-1 h-32 w-full">
        <line x1="0" y1="100" x2="300" y2="100" stroke="#E2E8F0" strokeWidth="1" />
        {data.map((d, i) => {
          const height = (d.conversations / max) * 90;
          const x = i * slotWidth + (slotWidth - barWidth) / 2;
          return (
            <rect
              key={d.date}
              x={x}
              y={100 - height}
              width={barWidth}
              height={Math.max(height, d.conversations > 0 ? 2 : 0)}
              rx={1.5}
              fill="#0D7377"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex text-[10px] text-[#9CA3AF]">
        {data.map((d, i) => (
          <span key={d.date} style={{ width: `${slotWidth}%` }} className="text-center">
            {i % 5 === 0 ? formatShortDate(d.date) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function TopActionsCard({ bookingClicks, paymentClicks }) {
  const total = bookingClicks + paymentClicks;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Top Actions</p>
      <p className="mt-1 text-xs text-[#4A5568]">This month</p>

      {total === 0 ? (
        <p className="mt-6 text-sm text-[#4A5568]">
          No booking or payment clicks yet — once customers use those buttons in your chat widget,
          they&apos;ll show up here.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {[
            { label: "Booking clicks", value: bookingClicks },
            { label: "Payment clicks", value: paymentClicks },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#4A5568]">{row.label}</span>
                <span className="font-bold text-[#1A1A2E]">{row.value.toLocaleString()}</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-[#F8F9FA]">
                <div
                  className="h-2 rounded-full bg-[#0D7377]"
                  style={{ width: `${total > 0 ? (row.value / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AllTimeStatsCard({ conversationsAllTime, messagesAllTime, memberSince }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">All Time Stats</p>
      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#4A5568]">Total conversations</span>
          <span className="font-bold text-[#1A1A2E]">{conversationsAllTime.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#4A5568]">Total messages</span>
          <span className="font-bold text-[#1A1A2E]">{messagesAllTime.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#4A5568]">Member since</span>
          <span className="font-bold text-[#1A1A2E]">{formatLongDate(memberSince)}</span>
        </div>
      </div>
    </div>
  );
}

function NoChatbotState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0D7377]/10">
        <ChatBubbleIcon className="h-10 w-10 text-[#0D7377]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-[#1A1A2E]">No analytics yet</h2>
      <p className="mt-3 max-w-sm text-[#4A5568]">
        Build your chatbot first — once it&apos;s live, you&apos;ll see conversation and engagement
        stats here.
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

export default function AnalyticsClient({ email, stats }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const comparison = stats
    ? formatComparison(stats.conversationsThisMonth, stats.conversationsLastMonth)
    : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <DashboardSidebar email={email} onSignOut={handleSignOut} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            {stats?.businessName ? `${stats.businessName}'s Performance` : "Your Chatbot's Performance"}
          </h1>

          {!stats ? (
            <NoChatbotState />
          ) : (
            <div className="mt-8 space-y-6">
              {/* Top stats row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={<ChatBubbleIcon className="h-4 w-4" />}
                  label="Conversations This Month"
                  value={stats.conversationsThisMonth.toLocaleString()}
                  comparison={comparison}
                  sub={!comparison ? "No data yet" : null}
                />
                <StatCard
                  icon={<CursorClickIcon className="h-4 w-4" />}
                  label="Widget Opens"
                  value={stats.widgetOpensThisMonth.toLocaleString()}
                  sub="This month"
                />
                <StatCard
                  icon={<CalendarIcon className="h-4 w-4" />}
                  label="Booking Clicks"
                  value={stats.bookingClicksThisMonth.toLocaleString()}
                  sub="This month"
                />
                <StatCard
                  icon={<AverageIcon className="h-4 w-4" />}
                  label="Avg Messages/Chat"
                  value={stats.avgMessagesPerConversation.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  sub={
                    stats.userMessagesThisMonth > 0
                      ? `${stats.userMessagesThisMonth.toLocaleString()} user messages this month`
                      : "No data yet"
                  }
                />
              </div>

              {/* Activity chart */}
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
                  Last 30 Days
                </p>
                <div className="mt-5">
                  <ActivityChart data={stats.chartData} />
                </div>
              </div>

              {/* Engagement stats */}
              <div className="grid gap-4 lg:grid-cols-2">
                <TopActionsCard
                  bookingClicks={stats.bookingClicksThisMonth}
                  paymentClicks={stats.paymentClicksThisMonth}
                />
                <AllTimeStatsCard
                  conversationsAllTime={stats.conversationsAllTime}
                  messagesAllTime={stats.messagesAllTime}
                  memberSince={stats.memberSince}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
