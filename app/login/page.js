"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5-9.75-7.5-9.75-7.5z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a3 3 0 104.24 4.24" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.88 5.09A9.77 9.77 0 0112 4.5c6 0 9.75 7.5 9.75 7.5a17.6 17.6 0 01-3.44 4.55M6.6 6.6C4.13 8.2 2.25 10.5 2.25 12c0 0 3.75 7.5 9.75 7.5a9.76 9.76 0 004.02-.84"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const checkRes = await fetch("/api/auth-rate-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "login" }),
    });
    if (!checkRes.ok) {
      const { error: rateLimitError } = await checkRes.json();
      setError(rateLimitError || "Too many requests. Please try again later.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError("Incorrect email or password. Please try again.");
      return;
    }

    // FOUNDER_EMAIL is server-only — ask the server (cookie-authenticated,
    // now that signInWithPassword has set the session cookie) whether this is the founder.
    const founderRes = await fetch("/api/is-founder");
    const { isFounder: signedInAsFounder } = founderRes.ok
      ? await founderRes.json()
      : { isFounder: false };

    if (signedInAsFounder) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = (factorsData?.totp ?? []).some((f) => f.status === "verified");

      if (!hasVerifiedTotp) {
        router.push("/admin/setup-mfa");
        return;
      }

      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      router.push(aalData?.currentLevel === "aal2" ? "/admin" : "/admin/verify");
      return;
    }

    setLoading(false);
    router.push("/dashboard");
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
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Welcome back</h1>
          <p className="mt-2 text-sm text-[#4A5568]">
            New here?{" "}
            <Link href="/signup" className="font-medium text-[#0D7377] hover:text-[#0A5D61]">
              Create an account
            </Link>
          </p>

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

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#4A5568]">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-[#0D7377] hover:text-[#0A5D61]"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 pr-11 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/60 focus:ring-2 focus:ring-[#0D7377]/20"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#9CA3AF] transition hover:text-[#0D7377]"
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
