"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthContext";
import { isFounder } from "../../../lib/founder";

export default function SetupMfaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isFounder(user.email)) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    (async () => {
      // Already enrolled? Don't start a second, redundant factor — go verify instead.
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = (factorsData?.totp ?? []).some((f) => f.status === "verified");
      if (hasVerifiedTotp) {
        router.replace("/admin/verify");
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (cancelled) return;

      if (error || !data) {
        setEnrollError(error?.message || "Could not start 2FA setup. Please try again.");
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
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

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    setVerifying(false);

    if (error) {
      setVerifyError("Invalid code, try again");
      return;
    }

    router.push("/admin");
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
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Set up two-factor authentication</h1>
          <p className="mt-2 text-sm text-[#4A5568]">
            Scan the QR code below with Google Authenticator (or any TOTP app), then enter the
            6-digit code it generates to finish setup.
          </p>

          {enrollError && (
            <p className="mt-6 rounded-xl border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-600">
              {enrollError}
            </p>
          )}

          {!enrollError && !ready && (
            <p className="mt-6 text-sm text-[#4A5568]">Generating your QR code…</p>
          )}

          {ready && (
            <>
              <div className="mt-6 flex justify-center rounded-xl border border-[#E2E8F0] bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="Scan this QR code with your authenticator app" className="h-48 w-48" />
              </div>

              <div className="mt-4 rounded-xl bg-[#F8F9FA] px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
                  Can&apos;t scan? Enter this code manually
                </p>
                <p className="mt-1 break-all font-mono text-sm text-[#1A1A2E]">{secret}</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                  {verifying ? "Verifying…" : "Verify & Enable 2FA"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
