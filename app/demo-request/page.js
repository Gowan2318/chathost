"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorSummary, FormField } from "../../components/builder/FormField";
import { INDUSTRIES } from "../../lib/industries";

const INDUSTRY_HINT_MAP = { lawncare: "lawn", realestate: "real_estate" };
const VALID_INDUSTRIES = new Set(INDUSTRIES.map((i) => i.id));

const INITIAL_FORM = {
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  business_name: "",
  business_phone: "",
  business_website: "",
  industry: "",
  business_description: "",
  services: "",
  hours: "",
  service_area: "",
  notes: "",
};

function inputClassNameAF(showValidation, error, isValid, autoFilled) {
  const base =
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#1A1A2E] outline-none transition placeholder-[#9CA3AF] focus:ring-2";
  if (showValidation && error) return `${base} border-red-400 focus:border-red-400 focus:ring-red-400/20`;
  if (showValidation && isValid) return `${base} border-green-500/60 focus:border-green-500/60 focus:ring-green-500/20`;
  if (autoFilled) return `${base} border-green-400 ring-2 ring-green-100 focus:border-green-400 focus:ring-green-200`;
  return `${base} border-[#CBD5E0] focus:border-[#0D7377]/50 focus:ring-[#0D7377]/20`;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function isValidPhone(v) {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

function validateForm(form, confirmBusinessPhone, confirmContactEmail) {
  const errors = {};
  const summary = [];
  const add = (key, msg) => {
    errors[key] = msg;
    summary.push(msg);
  };

  if (!form.contact_name.trim()) add("contact_name", "Your name is required.");
  if (!form.contact_email.trim()) add("contact_email", "Your email is required.");
  else if (!isValidEmail(form.contact_email)) add("contact_email", "Enter a valid email address.");

  if (form.contact_phone.trim() && !isValidPhone(form.contact_phone)) {
    add("contact_phone", "Enter a valid mobile number.");
  }

  if (!form.business_name.trim()) add("business_name", "Business name is required.");

  if (!form.business_phone.trim()) add("business_phone", "Business phone is required.");
  else if (!isValidPhone(form.business_phone)) add("business_phone", "Enter a valid phone number.");

  if (!form.industry) add("industry", "Please select an industry.");
  if (!form.services.trim()) add("services", "Please describe what services you offer.");
  if (!form.hours.trim()) add("hours", "Business hours are required.");

  if (!errors.business_phone && form.business_phone.trim() && !confirmBusinessPhone) {
    add("confirmBusinessPhone", "Please confirm your business phone number is correct.");
  }
  if (!errors.contact_email && form.contact_email.trim() && !confirmContactEmail) {
    add("confirmContactEmail", "Please confirm your email address is correct.");
  }

  return { valid: summary.length === 0, errors, summary };
}

export default function DemoRequestPage() {
  // "ask" -> "form" -> "done"
  const [stage, setStage] = useState("ask");
  const [hasWebsite, setHasWebsite] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedNote, setImportedNote] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [autoFilled, setAutoFilled] = useState(new Set());
  const [confirmBusinessPhone, setConfirmBusinessPhone] = useState(false);
  const [confirmContactEmail, setConfirmContactEmail] = useState(false);

  const [showValidation, setShowValidation] = useState(false);
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const clearAF = (field) =>
    setAutoFilled((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });

  const fieldValid = (key, validator) => showValidation && !errors[key] && validator();

  const handleNoWebsite = () => {
    setHasWebsite(false);
    setStage("form");
  };

  const handleScan = async () => {
    const trimmed = websiteUrl.trim();
    if (!trimmed || isImporting) return;
    setIsImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/import-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "We couldn't scan that site.");

      const { extracted } = data;
      const patch = {};

      if (extracted.businessName) patch.business_name = extracted.businessName;
      if (extracted.businessDescription) patch.business_description = extracted.businessDescription;
      if (extracted.servicesDescription) patch.services = extracted.servicesDescription;
      if (extracted.supportPhone) patch.business_phone = extracted.supportPhone;
      if (extracted.businessHours) patch.hours = extracted.businessHours;
      patch.business_website = extracted.websiteUrl || trimmed;

      if (extracted.industry_hint) {
        const mapped = INDUSTRY_HINT_MAP[extracted.industry_hint] ?? extracted.industry_hint;
        if (VALID_INDUSTRIES.has(mapped)) patch.industry = mapped;
      }

      const addrParts = [
        extracted.address?.street,
        extracted.address?.city,
        extracted.address?.state,
        extracted.address?.zip,
      ].filter(Boolean);
      if (addrParts.length > 0) patch.service_area = addrParts.join(", ");

      setAutoFilled(new Set(Object.keys(patch)));
      update(patch);
      setImportedNote(
        "We found some info from your website — please double-check everything below, especially your phone number."
      );
      setHasWebsite(true);
      setStage("form");
    } catch (err) {
      setImportError(err.message || "We couldn't scan that site. You can still fill in your info manually.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkipScan = () => {
    setHasWebsite(true);
    update({ business_website: websiteUrl.trim() });
    setStage("form");
  };

  const handleSubmit = async () => {
    const result = validateForm(form, confirmBusinessPhone, confirmContactEmail);
    setShowValidation(true);
    setErrors(result.errors);
    setSummary(result.summary);
    if (!result.valid) return;

    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, has_website: Boolean(hasWebsite) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit your request. Please try again.");
      setStage("done");
    } catch (err) {
      setSubmitError(err.message || "Could not submit your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A2E]">
      <header className="border-b border-[#E2E8F0] bg-white/95 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-[#1A1A2E]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D7377] text-sm font-black text-white shadow-md">
              V
            </span>
            <span>Vesta<span className="text-[#0D7377]">Chat</span>Host</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-[#4A5568] transition hover:text-[#0D7377]">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {stage !== "done" && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold sm:text-3xl">Get your free AI receptionist demo</h1>
            <p className="mt-2 text-[#4A5568]">
              No account, no payment — tell us about your business and we&apos;ll build you a live
              demo to try.
            </p>
          </div>
        )}

        {/* ── Stage: ask ── */}
        {stage === "ask" && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
            <p className="mb-6 text-center text-sm font-semibold text-[#1A1A2E]">
              Do you have a website?
            </p>

            <div className="mx-auto max-w-md space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScan();
                    }
                  }}
                  placeholder="https://yourbusiness.com"
                  disabled={isImporting}
                  className="flex-1 rounded-xl border border-[#CBD5E0] bg-white px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={!websiteUrl.trim() || isImporting}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0D7377] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0A5D61] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Scanning…
                    </>
                  ) : (
                    "Yes, scan my site"
                  )}
                </button>
              </div>

              {importError && (
                <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <p>{importError}</p>
                  <button
                    type="button"
                    onClick={handleSkipScan}
                    className="font-medium text-[#0D7377] underline hover:text-[#0A5D61]"
                  >
                    Continue without scanning
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E2E8F0]" />
                <span className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">or</span>
                <div className="h-px flex-1 bg-[#E2E8F0]" />
              </div>

              <button
                type="button"
                onClick={handleNoWebsite}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] py-3 text-sm font-semibold text-[#1A1A2E] transition hover:border-[#0D7377] hover:bg-[#E8F4F4]"
              >
                No, I don&apos;t have a website yet
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: form ── */}
        {stage === "form" && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
            <ErrorSummary summary={summary} show={showValidation} />

            {importedNote && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {importedNote}
              </div>
            )}

            {/* ── Section: About you ── */}
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#0D7377]">About you</h2>
              <p className="mt-1 text-xs text-[#4A5568]">How we&apos;ll reach you about your demo.</p>

              <div className="mt-4 space-y-5">
                <FormField
                  label="Your name"
                  htmlFor="contact-name"
                  showValidation={showValidation}
                  error={errors.contact_name}
                  isValid={fieldValid("contact_name", () => Boolean(form.contact_name.trim()))}
                >
                  <input
                    id="contact-name"
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => update({ contact_name: e.target.value })}
                    className={inputClassNameAF(showValidation, errors.contact_name, fieldValid("contact_name", () => Boolean(form.contact_name.trim())), false)}
                  />
                </FormField>

                <FormField
                  label="Your email"
                  htmlFor="contact-email"
                  hint="Where we'll send your demo and, later, your booking notifications"
                  showValidation={showValidation}
                  error={errors.contact_email}
                  isValid={fieldValid("contact_email", () => isValidEmail(form.contact_email))}
                >
                  <input
                    id="contact-email"
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => { update({ contact_email: e.target.value }); setConfirmContactEmail(false); }}
                    className={inputClassNameAF(showValidation, errors.contact_email, fieldValid("contact_email", () => isValidEmail(form.contact_email)), false)}
                  />
                </FormField>
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                  showValidation && errors.confirmContactEmail ? "border-red-400 bg-red-50" : "border-[#E2E8F0] bg-[#F8F9FA]"
                }`}>
                  <input
                    type="checkbox"
                    checked={confirmContactEmail}
                    onChange={(e) => setConfirmContactEmail(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#0D7377]"
                  />
                  <span className="text-[#1A1A2E]">Yes, this email address is correct — this is where my demo will be sent.</span>
                </label>

                <FormField
                  label="Your mobile"
                  htmlFor="contact-phone"
                  hint="So we can reach you about your demo"
                  showValidation={showValidation}
                  error={errors.contact_phone}
                  isValid={fieldValid("contact_phone", () => Boolean(form.contact_phone.trim()) && isValidPhone(form.contact_phone))}
                >
                  <input
                    id="contact-phone"
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => update({ contact_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className={inputClassNameAF(showValidation, errors.contact_phone, fieldValid("contact_phone", () => Boolean(form.contact_phone.trim()) && isValidPhone(form.contact_phone)), false)}
                  />
                </FormField>
              </div>
            </div>

            {/* ── Section: About your business ── */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#0D7377]">About your business</h2>
              <p className="mt-1 text-xs text-[#4A5568]">What your AI receptionist will know.</p>

              <div className="mt-4 space-y-5">
                <FormField
                  label="Business name"
                  htmlFor="business-name"
                  showValidation={showValidation}
                  error={errors.business_name}
                  isValid={fieldValid("business_name", () => Boolean(form.business_name.trim()))}
                >
                  <input
                    id="business-name"
                    type="text"
                    value={form.business_name}
                    onChange={(e) => { update({ business_name: e.target.value }); clearAF("business_name"); }}
                    className={inputClassNameAF(showValidation, errors.business_name, fieldValid("business_name", () => Boolean(form.business_name.trim())), autoFilled.has("business_name"))}
                  />
                </FormField>

                <FormField
                  label="Business phone"
                  htmlFor="business-phone"
                  hint="The number your customers call — this is the line you'd forward to your AI receptionist"
                  showValidation={showValidation}
                  error={errors.business_phone}
                  isValid={fieldValid("business_phone", () => Boolean(form.business_phone.trim()) && isValidPhone(form.business_phone))}
                >
                  <input
                    id="business-phone"
                    type="tel"
                    value={form.business_phone}
                    onChange={(e) => { update({ business_phone: e.target.value }); clearAF("business_phone"); setConfirmBusinessPhone(false); }}
                    placeholder="(555) 123-4567"
                    className={inputClassNameAF(showValidation, errors.business_phone, fieldValid("business_phone", () => Boolean(form.business_phone.trim()) && isValidPhone(form.business_phone)), autoFilled.has("business_phone"))}
                  />
                </FormField>
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                  showValidation && errors.confirmBusinessPhone ? "border-red-400 bg-red-50" : "border-[#E2E8F0] bg-[#F8F9FA]"
                }`}>
                  <input
                    type="checkbox"
                    checked={confirmBusinessPhone}
                    onChange={(e) => setConfirmBusinessPhone(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#0D7377]"
                  />
                  <span className="text-[#1A1A2E]">Yes, this is the correct business phone number.</span>
                </label>

                <FormField
                  label="Industry"
                  htmlFor="industry"
                  showValidation={showValidation}
                  error={errors.industry}
                  isValid={fieldValid("industry", () => Boolean(form.industry))}
                >
                  <select
                    id="industry"
                    value={form.industry}
                    onChange={(e) => { update({ industry: e.target.value }); clearAF("industry"); }}
                    className={inputClassNameAF(showValidation, errors.industry, fieldValid("industry", () => Boolean(form.industry)), autoFilled.has("industry"))}
                  >
                    <option value="">Select an industry…</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="What services do you offer?"
                  htmlFor="services"
                  showValidation={showValidation}
                  error={errors.services}
                  isValid={fieldValid("services", () => Boolean(form.services.trim()))}
                >
                  <textarea
                    id="services"
                    rows={3}
                    value={form.services}
                    onChange={(e) => { update({ services: e.target.value }); clearAF("services"); }}
                    placeholder="List your main services, packages, or specialties…"
                    className={inputClassNameAF(showValidation, errors.services, fieldValid("services", () => Boolean(form.services.trim())), autoFilled.has("services"))}
                  />
                </FormField>

                <FormField
                  label="Business hours"
                  htmlFor="hours"
                  showValidation={showValidation}
                  error={errors.hours}
                  isValid={fieldValid("hours", () => Boolean(form.hours.trim()))}
                >
                  <textarea
                    id="hours"
                    rows={2}
                    value={form.hours}
                    onChange={(e) => { update({ hours: e.target.value }); clearAF("hours"); }}
                    placeholder="e.g. Mon-Fri 9am-5pm, Sat 10am-2pm, Closed Sunday"
                    className={inputClassNameAF(showValidation, errors.hours, fieldValid("hours", () => Boolean(form.hours.trim())), autoFilled.has("hours"))}
                  />
                </FormField>

                <FormField
                  label="Service area or address"
                  htmlFor="service-area"
                  showValidation={false}
                  error={null}
                  isValid={false}
                >
                  <input
                    id="service-area"
                    type="text"
                    value={form.service_area}
                    onChange={(e) => { update({ service_area: e.target.value }); clearAF("service_area"); }}
                    placeholder="e.g. 123 Main St, Pittsburgh, PA — or 'Pittsburgh and 20 miles around'"
                    className={inputClassNameAF(false, null, false, autoFilled.has("service_area"))}
                  />
                </FormField>

                <FormField
                  label="Anything else your AI should know? (optional)"
                  htmlFor="notes"
                  showValidation={false}
                  error={null}
                  isValid={false}
                >
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    placeholder="Promotions, policies, anything unique about how you operate…"
                    className={inputClassNameAF(false, null, false, false)}
                  />
                </FormField>
              </div>
            </div>

            {submitError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {submitError}
              </p>
            )}

            <div className="mt-8 flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setStage("ask")}
                className="rounded-xl border border-[#E2E8F0] px-6 py-2.5 text-sm font-medium text-[#4A5568] transition hover:bg-[#F8F9FA]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-[#0D7377] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#0A5D61] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting…" : "Get my free demo"}
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: done ── */}
        {stage === "done" && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F4F4] text-3xl">
              🎉
            </div>
            <h1 className="mt-6 text-2xl font-bold text-[#1A1A2E]">Thanks — your demo request is in!</h1>
            <p className="mx-auto mt-3 max-w-md text-[#4A5568]">
              We&apos;ll build your custom AI receptionist demo and email you within 24 hours.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-xl bg-[#0D7377] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0A5D61]"
            >
              Back to home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
