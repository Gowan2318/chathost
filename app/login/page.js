"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError("Incorrect email or password. Please try again.");
      return;
    }

    router.push("/dashboard");
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

      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="mb-10 flex items-center gap-3 transition hover:opacity-90">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-xl font-black text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/25">
            V
          </span>
          <span className="text-2xl font-bold tracking-tight">
            Vesta<span className="text-[#D4AF37]">Chat</span>Host
          </span>
        </Link>

        <div className="w-full rounded-2xl border border-white/10 bg-[#1A1A1A]/90 p-8 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-[#a3a3a3]">
            New here?{" "}
            <Link href="/signup" className="font-medium text-[#D4AF37] hover:text-[#F0D060]">
              Create an account
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#a3a3a3]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/30"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#a3a3a3]">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-[#D4AF37] hover:text-[#F0D060]"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/30"
                placeholder="Your password"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#D4AF37] py-3.5 text-sm font-bold text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20 transition hover:bg-[#F0D060] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
