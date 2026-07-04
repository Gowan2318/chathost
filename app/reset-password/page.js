"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://vestachathost.com/reset-password/confirm",
    });

    setLoading(false);

    if (authError) {
      setError(authError.message || "Could not send reset link. Please try again.");
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="mb-10 flex items-center gap-3 transition hover:opacity-90">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D7377] to-[#14A3A8] text-xl font-black text-white shadow-lg shadow-[#0D7377]/25">
            V
          </span>
          <span className="text-2xl font-bold tracking-tight text-[#1A1A2E]">
            Vesta<span className="text-[#0D7377]">Chat</span>Host
          </span>
        </Link>

        <div className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Reset your password</h1>
          <p className="mt-2 text-sm text-[#4A5568]">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-[#0D7377] hover:text-[#0A5D61]">
              Back to login
            </Link>
          </p>

          {sent ? (
            <p className="mt-8 rounded-xl border border-[#0D7377]/30 bg-[#0D7377]/10 px-4 py-3 text-sm text-[#0D7377]">
              Check your email — we sent you a reset link.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#4A5568]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/60 focus:ring-2 focus:ring-[#0D7377]/20"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#0D7377] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0D7377]/20 transition hover:bg-[#0A5D61] disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
