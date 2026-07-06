"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthContext";

export default function VerifyMfaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [setupError, setSetupError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      // FOUNDER_EMAIL is server-only — ask the server (cookie-authenticated)
      // whether this is the founder instead of checking it in the browser.
      const founderRes = await fetch("/api/is-founder");
      const { isFounder: userIsFounder } = founderRes.ok
        ? await founderRes.json()
        : { isFounder: false };

      if (cancelled) return;
      if (!userIsFounder) {
        router.replace("/dashboard");
        return;
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = (factorsData?.totp ?? []).find((f) => f.status === "verified");

      if (cancelled) return;

      if (factorsError || !verifiedFactor) {
        // No enrolled factor to verify against — go set one up instead of
        // showing a form that can never succeed.
        router.replace("/admin/setup-mfa");
        return;
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (cancelled) return;

      if (challengeError || !challengeData) {
        setSetupError(challengeError?.message || "Could not start verification. Please try again.");
        return;
      }

      setFactorId(verifiedFactor.id);
      setChallengeId(challengeData.id);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setVerifyError("");
    setVerifying(true);

    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });

    setVerifying(false);

    if (error) {
      setVerifyError("Invalid code, try again");
      return;
    }

    router.push("/admin");
  }

  async function handleBackToLogin() {
    await supabase.auth.signOut();
    router.push("/login");
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
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Two-factor verification</h1>
          <p className="mt-2 text-sm text-[#4A5568]">
            Enter the 6-digit code from your Google Authenticator app.
          </p>

          {setupError && (
            <p className="mt-6 rounded-xl border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-600">
              {setupError}
            </p>
          )}

          {!setupError && !ready && (
            <p className="mt-6 text-sm text-[#4A5568]">Preparing verification…</p>
          )}

          {ready && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-[#4A5568]">
                  6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-center text-lg tracking-[0.3em] text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/60 focus:ring-2 focus:ring-[#0D7377]/20"
                  placeholder="000000"
                />
              </div>

              {verifyError && (
                <p className="rounded-xl border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {verifyError}
                </p>
              )}

              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="w-full rounded-xl bg-[#0D7377] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0D7377]/20 transition hover:bg-[#0A5D61] disabled:opacity-50"
              >
                {verifying ? "Verifying…" : "Verify"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={handleBackToLogin}
            className="mt-6 w-full text-center text-sm font-medium text-[#0D7377] hover:text-[#0A5D61]"
          >
            Back to login
          </button>
        </div>
      </main>
    </div>
  );
}
