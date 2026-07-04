"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../dashboard/DashboardSidebar";

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <circle cx="9" cy="8" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.75 19.25a6.25 6.25 0 0112.5 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 5.1a3.25 3.25 0 010 6.3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.25 13.1a6.25 6.25 0 015 6.15" />
    </svg>
  );
}

function DollarIcon(props) {
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

function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
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

const NAV_ITEMS = [
  { label: "Admin", href: "/admin", icon: HomeIcon },
  { label: "Clients", href: "/admin#clients", icon: UsersIcon },
  { label: "Revenue", href: "/admin#revenue", icon: DollarIcon },
];

export { MenuIcon };

export default function AdminSidebar({ email, onSignOut, open, onClose }) {
  const pathname = usePathname();

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

        <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-widest text-[#0D7377]">
          Founder Admin
        </p>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = !item.href.includes("#") && pathname === item.href;
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
        </div>
      </aside>
    </>
  );
}
