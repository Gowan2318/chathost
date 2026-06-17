"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/AuthContext";
import { getSupabaseClient } from "../../../lib/supabase";
import { buildChatbotConfig } from "../../../lib/chatbot-config";
import { composeBusinessInfo } from "../../../lib/builder-form";
import { createDefaultBusinessHours } from "../../../lib/builder-hours";
import { INDUSTRY_LABELS } from "../../../lib/industries";
import AddressInput from "../../../components/builder/AddressInput";
import BrandColorPicker from "../../../components/builder/BrandColorPicker";
import BusinessHoursEditor from "../../../components/builder/BusinessHoursEditor";
import ChatThemeSelector from "../../../components/builder/ChatThemeSelector";
import { FormField, inputClassName } from "../../../components/builder/FormField";
import MascotCharacter from "../../../components/mascots/MascotCharacter";
import QuickRepliesEditor from "../../../components/builder/QuickRepliesEditor";
import {
  validateBrandColor,
  validateBusinessDescription,
  validateBusinessName,
  validateEmail,
  validateHttpsUrl,
  validateMascotName,
  validatePhone,
  validateServicesDescription,
} from "../../../lib/builder-validation";

function configToForm(config) {
  return {
    businessName: config.businessName || "",
    industry: config.industry || "",
    businessDescription: config.businessDescription || "",
    servicesDescription: config.servicesDescription || "",
    businessHours: config.businessHours || createDefaultBusinessHours(),
    address: config.address || { street: "", city: "", state: "", zip: "" },
    supportPhone: config.supportPhone || "",
    supportEmail: config.supportEmail || "",
    bookingUrl: config.booking_url || "",
    payNowUrl: config.payNowUrl || "",
    brandColor: config.brandColor || "#D4AF37",
    chatTheme: config.chatTheme || "light",
    quickReplies: Array.isArray(config.quickReplies) ? config.quickReplies : [],
    customQA: Array.isArray(config.customQA) ? config.customQA : [],
    mascotName: config.mascotName || "",
    websiteUrl: config.websiteUrl || "",
  };
}

function validateForm(form) {
  const errors = {};
  const add = (key, msg) => { errors[key] = msg; };

  const nameErr = validateBusinessName(form.businessName);
  if (nameErr) add("businessName", nameErr);

  const descErr = validateBusinessDescription(form.businessDescription);
  if (descErr) add("businessDescription", descErr);

  const svcErr = validateServicesDescription(form.servicesDescription);
  if (svcErr) add("servicesDescription", svcErr);

  const phoneErr = validatePhone(form.supportPhone);
  if (phoneErr) add("supportPhone", phoneErr);

  const emailErr = validateEmail(form.supportEmail);
  if (emailErr) add("supportEmail", emailErr);

  if (form.bookingUrl.trim()) {
    const urlErr = validateHttpsUrl(form.bookingUrl);
    if (urlErr) add("bookingUrl", urlErr);
  }

  if (form.payNowUrl.trim()) {
    const urlErr = validateHttpsUrl(form.payNowUrl);
    if (urlErr) add("payNowUrl", urlErr);
  }

  const colorErr = validateBrandColor(form.brandColor);
  if (colorErr) add("brandColor", colorErr);

  const mascotErr = validateMascotName(form.mascotName);
  if (mascotErr) add("mascotName", mascotErr);

  return errors;
}

export default function EditBotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [fetchLoading, setFetchLoading] = useState(true);
  const [clientId, setClientId] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    supabase
      .from("chatbots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!data?.[0]) {
          router.replace("/dashboard");
          return;
        }
        setClientId(data[0].client_id);
        setForm(configToForm(data[0].config));
        setFetchLoading(false);
      });
  }, [user, router]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const businessInfo = useMemo(
    () => (form ? composeBusinessInfo(form) : ""),
    [form]
  );

  async function handleSave() {
    setAttempted(true);
    setSaveSuccess(false);
    setSaveError("");

    const errs = validateForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const updatedConfig = buildChatbotConfig(form, businessInfo);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/update-chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ clientId, config: updatedConfig }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not save changes.");
      }
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSaveError(err?.message || "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || fetchLoading || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-[#a3a3a3]">
        Loading…
      </div>
    );
  }

  const field = (key, validator) =>
    attempted && !errors[key] && validator(form) === null;

  const descLen = form.businessDescription.trim().length;
  const svcLen = form.servicesDescription.trim().length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#D4AF37]/8 via-transparent to-transparent" aria-hidden />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-lg font-black text-[#0A0A0A]">
              V
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Vesta<span className="text-[#D4AF37]">Chat</span>Host
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#a3a3a3] transition hover:text-[#F0D060]"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">
          Configure Bot
        </div>
        <h1 className="mb-8 text-2xl font-bold text-white sm:text-3xl">
          Edit Your Chatbot
        </h1>

        {saveSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4">
            <svg className="h-5 w-5 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-green-400">Changes saved successfully!</p>
          </div>
        )}

        {Object.keys(errors).length > 0 && attempted && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-red-400">Please fix the following errors:</p>
            <ul className="mt-2 space-y-1 text-sm text-red-300">
              {Object.values(errors).map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-6">
          {/* Business basics */}
          <section className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 sm:p-8">
            <h2 className="mb-5 text-base font-semibold text-white">Business Basics</h2>
            <div className="space-y-5">
              <FormField
                label="Business name"
                htmlFor="edit-business-name"
                showValidation={attempted}
                error={errors.businessName}
                isValid={field("businessName", (f) => validateBusinessName(f.businessName))}
              >
                <input
                  id="edit-business-name"
                  type="text"
                  value={form.businessName}
                  onChange={(e) => update({ businessName: e.target.value })}
                  placeholder="e.g. Sunrise Dental Studio"
                  className={inputClassName(
                    attempted,
                    errors.businessName,
                    field("businessName", (f) => validateBusinessName(f.businessName))
                  )}
                />
              </FormField>

              <div className="rounded-xl border border-white/10 bg-[#111111] px-4 py-3">
                <p className="text-xs font-medium text-[#a3a3a3]">Industry</p>
                <p className="mt-0.5 text-sm font-medium text-white">
                  {INDUSTRY_LABELS[form.industry] || form.industry || "—"}
                </p>
                <p className="mt-1 text-xs text-[#555]">Industry cannot be changed after setup.</p>
              </div>

              <FormField
                label="Business description"
                htmlFor="edit-description"
                showValidation={attempted}
                error={errors.businessDescription}
                isValid={field("businessDescription", (f) => validateBusinessDescription(f.businessDescription))}
                counter={
                  <span className={`text-xs ${descLen >= 50 ? "text-green-400" : "text-[#a3a3a3]"}`}>
                    {descLen}/50
                  </span>
                }
              >
                <textarea
                  id="edit-description"
                  rows={4}
                  value={form.businessDescription}
                  onChange={(e) => update({ businessDescription: e.target.value })}
                  placeholder="Tell customers about your business, mission, and what makes you unique…"
                  className={inputClassName(
                    attempted,
                    errors.businessDescription,
                    field("businessDescription", (f) => validateBusinessDescription(f.businessDescription))
                  )}
                />
              </FormField>

              <FormField
                label="Services"
                htmlFor="edit-services"
                showValidation={attempted}
                error={errors.servicesDescription}
                isValid={field("servicesDescription", (f) => validateServicesDescription(f.servicesDescription))}
                counter={
                  <span className={`text-xs ${svcLen >= 20 ? "text-green-400" : "text-[#a3a3a3]"}`}>
                    {svcLen}/20
                  </span>
                }
              >
                <textarea
                  id="edit-services"
                  rows={3}
                  value={form.servicesDescription}
                  onChange={(e) => update({ servicesDescription: e.target.value })}
                  placeholder="List your main services, packages, or specialties…"
                  className={inputClassName(
                    attempted,
                    errors.servicesDescription,
                    field("servicesDescription", (f) => validateServicesDescription(f.servicesDescription))
                  )}
                />
              </FormField>
            </div>
          </section>

          {/* Hours, location, contact */}
          <section className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 sm:p-8">
            <h2 className="mb-5 text-base font-semibold text-white">Hours, Location &amp; Contact</h2>
            <div className="space-y-5">
              <BusinessHoursEditor
                hours={form.businessHours}
                onChange={(businessHours) => update({ businessHours })}
              />

              <AddressInput
                address={form.address}
                onChange={(address) => update({ address })}
                showValidation={attempted}
                errors={errors}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Support phone"
                  htmlFor="edit-phone"
                  showValidation={attempted}
                  error={errors.supportPhone}
                  isValid={field("supportPhone", (f) => validatePhone(f.supportPhone))}
                >
                  <input
                    id="edit-phone"
                    type="tel"
                    value={form.supportPhone}
                    onChange={(e) => update({ supportPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className={inputClassName(attempted, errors.supportPhone, field("supportPhone", (f) => validatePhone(f.supportPhone)))}
                  />
                </FormField>
                <FormField
                  label="Support email"
                  htmlFor="edit-email"
                  showValidation={attempted}
                  error={errors.supportEmail}
                  isValid={field("supportEmail", (f) => validateEmail(f.supportEmail))}
                >
                  <input
                    id="edit-email"
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => update({ supportEmail: e.target.value })}
                    placeholder="support@yourbusiness.com"
                    className={inputClassName(attempted, errors.supportEmail, field("supportEmail", (f) => validateEmail(f.supportEmail)))}
                  />
                </FormField>
              </div>

              <FormField
                label="Appointment booking link (optional)"
                htmlFor="edit-booking"
                showValidation={attempted}
                error={errors.bookingUrl}
                isValid={attempted && !errors.bookingUrl && !!form.bookingUrl.trim() && validateHttpsUrl(form.bookingUrl) === null}
                hint="Calendly, Square, etc. Leave blank if you don't take online bookings."
              >
                <input
                  id="edit-booking"
                  type="url"
                  value={form.bookingUrl}
                  onChange={(e) => update({ bookingUrl: e.target.value })}
                  placeholder="https://calendly.com/yourbusiness"
                  className={inputClassName(
                    attempted,
                    errors.bookingUrl,
                    attempted && !errors.bookingUrl && !!form.bookingUrl.trim() && validateHttpsUrl(form.bookingUrl) === null
                  )}
                />
              </FormField>

              <FormField
                label="Payment link (optional)"
                htmlFor="edit-pay"
                showValidation={attempted}
                error={errors.payNowUrl}
                isValid={attempted && !errors.payNowUrl && !!form.payNowUrl.trim() && validateHttpsUrl(form.payNowUrl) === null}
                hint="Stripe, PayPal, Square, etc. Must start with https:// if provided."
              >
                <input
                  id="edit-pay"
                  type="url"
                  value={form.payNowUrl}
                  onChange={(e) => update({ payNowUrl: e.target.value })}
                  placeholder="https://yourbusiness.com/pay"
                  className={inputClassName(
                    attempted,
                    errors.payNowUrl,
                    attempted && !errors.payNowUrl && !!form.payNowUrl.trim() && validateHttpsUrl(form.payNowUrl) === null
                  )}
                />
              </FormField>
            </div>
          </section>

          {/* Branding */}
          <section className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 sm:p-8">
            <h2 className="mb-5 text-base font-semibold text-white">Branding</h2>
            <div className="space-y-6">
              <BrandColorPicker
                value={form.brandColor}
                onChange={(brandColor) => update({ brandColor })}
                showValidation={attempted}
                error={errors.brandColor}
                isValid={field("brandColor", (f) => validateBrandColor(f.brandColor))}
              />
              <ChatThemeSelector
                value={form.chatTheme}
                brandColor={form.brandColor}
                onChange={(chatTheme) => update({ chatTheme })}
              />
            </div>
          </section>

          {/* Quick replies */}
          <section className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 sm:p-8">
            <h2 className="mb-5 text-base font-semibold text-white">Quick Replies &amp; Custom Q&amp;A</h2>
            <QuickRepliesEditor
              industry={form.industry || "other"}
              quickReplies={form.quickReplies}
              onChange={(quickReplies) => update({ quickReplies })}
              customQA={form.customQA}
              onCustomQAChange={(customQA) => update({ customQA })}
              showValidation={attempted}
              fieldErrors={errors}
            />
          </section>

          {/* Mascot */}
          <section className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 sm:p-8">
            <h2 className="mb-5 text-base font-semibold text-white">Mascot</h2>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#D4AF37]/20 bg-[#111111] px-8 py-6">
                <MascotCharacter industry={form.industry || "other"} animation="bounce" size={100} />
                <p className="text-sm font-medium text-[#F0D060]">
                  {INDUSTRY_LABELS[form.industry] || "Your"} mascot
                </p>
              </div>
              <div className="flex-1">
                <p className="mb-3 text-sm text-[#a3a3a3]">
                  Give your mascot a friendly name. It appears in the chat header and helps your brand feel personal.
                </p>
                <FormField
                  label="Mascot name"
                  htmlFor="edit-mascot"
                  showValidation={attempted}
                  error={errors.mascotName}
                  isValid={field("mascotName", (f) => validateMascotName(f.mascotName))}
                >
                  <input
                    id="edit-mascot"
                    type="text"
                    value={form.mascotName}
                    onChange={(e) => update({ mascotName: e.target.value })}
                    placeholder="e.g. Smiley, Coach Max, Leafy"
                    maxLength={20}
                    className={inputClassName(
                      attempted,
                      errors.mascotName,
                      field("mascotName", (f) => validateMascotName(f.mascotName))
                    )}
                  />
                </FormField>
                <p className="mt-2 rounded-lg bg-[#0A0A0A] px-3 py-2 text-xs text-[#a3a3a3]">
                  Letters and spaces only · 2–20 characters
                </p>
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#D4AF37] px-8 py-3 text-sm font-bold text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20 transition hover:bg-[#F0D060] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[#a3a3a3] transition hover:text-[#F0D060]"
            >
              Cancel
            </Link>
          </div>

          {saveError && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {saveError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
