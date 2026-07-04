"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isFounder } from "../../lib/founder";

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
    </svg>
  );
}

function SettingsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function CardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <rect x="2.25" y="5.25" width="19.5" height="13.5" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 9.75h19.5" />
    </svg>
  );
}

export function HelpIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <circle cx="12" cy="12" r="9.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.25 9.25a2.75 2.75 0 115.163 1.3c-.5.85-1.413 1.2-1.413 2.2v.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
    </svg>
  );
}

function BookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 016.5 3H12v18H6.5A2.5 2.5 0 014 18.5v-13z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 5.5A2.5 2.5 0 0017.5 3H12v18h5.5a2.5 2.5 0 002.5-2.5v-13z" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}

function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5l7 2.75v5.25c0 4.5-3 8.25-7 9.5-4-1.25-7-5-7-9.5V6.25L12 3.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.25l2 2 4-4.5" />
    </svg>
  );
}

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function Logo({ light }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D7377] to-[#14A3A8] text-base font-black text-white shadow-lg shadow-[#0D7377]/20">
        V
      </span>
      <span className={`text-base font-bold tracking-tight ${light ? "text-white" : "text-[#1A1A2E]"}`}>
        Vesta<span className="text-[#14A3A8]">Chat</span>Host
      </span>
    </span>
  );
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { label: "Edit Bot", href: "/dashboard/edit", icon: SettingsIcon },
  { label: "Subscription", href: "/dashboard#subscription", icon: CardIcon },
  { label: "Support", href: "mailto:support@vestachathost.com", icon: HelpIcon },
  { label: "Install Guide", href: "/dashboard/install", icon: BookIcon },
];

export default function DashboardSidebar({ email, onSignOut, open, onClose }) {
  const pathname = usePathname();

  const navItems = isFounder(email)
    ? [...NAV_ITEMS, { label: "Admin", href: "/admin", icon: ShieldIcon }]
    : NAV_ITEMS;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-[#1A1A2E] transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <Logo light />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            // Anchor/mailto links (Subscription, Support) aren't distinct routes,
            // so only real pages participate in active-state matching.
            const isActive = !item.href.includes("#") && !item.href.startsWith("mailto:") && pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#0D7377] text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate px-2 text-xs text-gray-400">{email}</p>
          <button
            type="button"
            onClick={onSignOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/5"
          >
            Sign Out
          </button>
          <div className="mt-3 flex gap-3 px-3">
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-xs text-[#4A5568] hover:text-white transition">Terms</a>
            <span className="text-xs text-[#4A5568]">·</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-[#4A5568] hover:text-white transition">Privacy</a>
          </div>
        </div>
      </aside>
    </>
  );
}
