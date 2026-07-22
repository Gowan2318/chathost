"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/AuthContext";
import DashboardSidebar, { Logo, MenuIcon } from "../../../components/dashboard/DashboardSidebar";

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <rect x="3.25" y="4.75" width="17.5" height="15.5" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.25 9.25h17.5M8 3v3M16 3v3" />
    </svg>
  );
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

const TYPE_LABELS = { booking: "Booking", message: "Message" };
const TYPE_BADGE_CLASSES = {
  booking: "bg-[#0D7377]/10 text-[#0D7377]",
  message: "bg-[#F8F9FA] text-[#4A5568]",
};

const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_DOT_COLORS = {
  new: "bg-[#0D7377]",
  contacted: "bg-yellow-500",
  confirmed: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-500",
};

function TypeBadge({ type }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        TYPE_BADGE_CLASSES[type] ?? TYPE_BADGE_CLASSES.message
      }`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusBadge({ status }) {
  const dotColor = STATUS_DOT_COLORS[status] ?? "bg-gray-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#1A1A2E]">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function EmptyBookingsState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0D7377]/10">
        <CalendarIcon className="h-10 w-10 text-[#0D7377]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-[#1A1A2E]">No bookings yet</h2>
      <p className="mt-3 max-w-sm text-[#4A5568]">
        When your AI receptionist takes a call, bookings will appear here.
      </p>
    </div>
  );
}

function NoChatbotState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0D7377]/10">
        <ChatBubbleIcon className="h-10 w-10 text-[#0D7377]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-[#1A1A2E]">No bookings yet</h2>
      <p className="mt-3 max-w-sm text-[#4A5568]">
        Build your chatbot first — once it&apos;s live, bookings from your AI receptionist will show
        up here.
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

function BookingCard({ booking, showBusinessName }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-[#1A1A2E]">{booking.caller_name || "Unknown caller"}</p>
        <TypeBadge type={booking.type} />
      </div>
      {showBusinessName && (
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[#0D7377]">
          {booking.businessName || "—"}
        </p>
      )}
      {booking.caller_phone && (
        <p className="mt-1 text-sm text-[#4A5568]">{booking.caller_phone}</p>
      )}
      {booking.service && (
        <p className="mt-2 text-sm text-[#1A1A2E]">
          <span className="text-[#4A5568]">Service: </span>
          {booking.service}
        </p>
      )}
      {booking.requested_time && (
        <p className="text-sm text-[#1A1A2E]">
          <span className="text-[#4A5568]">Requested: </span>
          {booking.requested_time}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-[#4A5568]">
        <StatusBadge status={booking.status} />
        <span>{formatDateTime(booking.created_at)}</span>
      </div>
    </div>
  );
}

function BookingsTable({ bookings, showBusinessName }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
        All Bookings &amp; Messages
      </p>

      {/* Card list on small screens */}
      <div className="mt-5 space-y-3 sm:hidden">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} showBusinessName={showBusinessName} />
        ))}
      </div>

      {/* Table on larger screens, scrolls horizontally if needed */}
      <div className="mt-5 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
              {showBusinessName && <th className="pb-3 pr-4">Business</th>}
              <th className="pb-3 pr-4">Caller</th>
              <th className="pb-3 pr-4">Phone</th>
              <th className="pb-3 pr-4">Service</th>
              <th className="pb-3 pr-4">Requested Time</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Received</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b border-[#E2E8F0] last:border-0">
                {showBusinessName && (
                  <td className="py-3 pr-4 text-[#4A5568]">{booking.businessName || "—"}</td>
                )}
                <td className="py-3 pr-4 font-semibold text-[#1A1A2E]">
                  {booking.caller_name || "—"}
                </td>
                <td className="py-3 pr-4 text-[#4A5568]">{booking.caller_phone || "—"}</td>
                <td className="py-3 pr-4 text-[#4A5568]">{booking.service || "—"}</td>
                <td className="py-3 pr-4 text-[#4A5568]">{booking.requested_time || "—"}</td>
                <td className="py-3 pr-4">
                  <TypeBadge type={booking.type} />
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={booking.status} />
                </td>
                <td className="py-3 text-[#4A5568]">{formatDateTime(booking.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BookingsClient({ email, isFounder, bookings, showBusinessName = false }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <DashboardSidebar email={email} isFounder={isFounder} onSignOut={handleSignOut} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Bookings</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            Calls &amp; Bookings
          </h1>

          {bookings === null ? (
            <NoChatbotState />
          ) : bookings.length === 0 ? (
            <EmptyBookingsState />
          ) : (
            <div className="mt-8">
              <BookingsTable bookings={bookings} showBusinessName={showBusinessName} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
