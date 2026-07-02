"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AddressInput from "../../components/builder/AddressInput";
import BrandColorPicker from "../../components/builder/BrandColorPicker";
import ChatThemeSelector from "../../components/builder/ChatThemeSelector";
import BusinessHoursEditor from "../../components/builder/BusinessHoursEditor";
import { ErrorSummary, FormField, inputClassName } from "../../components/builder/FormField";
import IndustrySelector from "../../components/builder/IndustrySelector";
import QuickRepliesEditor from "../../components/builder/QuickRepliesEditor";
import ChatWidget from "../../components/ChatWidget";
import MascotCharacter from "../../components/mascots/MascotCharacter";
import { composeBusinessInfo } from "../../lib/builder-form";
import { createDefaultBusinessHours } from "../../lib/builder-hours";
import { getIndustryQuickReplySuggestions } from "../../lib/builder-quick-replies";
import {
  validateBrandColor,
  validateBusinessName,
  validateBusinessDescription,
  validateEmail,
  validateIndustry,
  validateMascotName,
  validatePhone,
  validateHttpsUrl,
  validateServicesDescription,
  validateStep,
  validateWebsiteUrl,
} from "../../lib/builder-validation";
import { INDUSTRY_LABELS } from "../../lib/industries";

const TOTAL_STEPS = 6;

const STRIPE_PAYMENT_LINK =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ||
  "https://buy.stripe.com/test";

const INITIAL = {
  businessName: "",
  industry: "",
  businessDescription: "",
  servicesDescription: "",
  businessHours: createDefaultBusinessHours(),
  address: { street: "", city: "", state: "", zip: "" },
  supportPhone: "",
  supportEmail: "",
  payNowUrl: "",
  brandColor: "#D4AF37",
  chatTheme: "light",
  quickReplies: [],
  customQA: [],
  mascotName: "",
  websiteUrl: "",
};

function StepIndicator({ current }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
              n === current
                ? "bg-[#D4AF37] text-[#0A0A0A] shadow-md shadow-[#D4AF37]/30"
                : n < current
                  ? "bg-[#D4AF37]/20 text-[#F0D060]"
                  : "bg-[#1A1A1A] text-[#a3a3a3]"
            }`}
          >
            {n}
          </div>
          {n < TOTAL_STEPS && (
            <div
              className={`hidden h-0.5 w-6 sm:block md:w-10 ${
                n < current ? "bg-[#D4AF37]/50" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BuilderPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);
  const [attemptedStep, setAttemptedStep] = useState(null);
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState([]);

  const showValidation = attemptedStep === step;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const businessInfo = useMemo(() => composeBusinessInfo(form), [form]);

  const chatConfig = useMemo(
    () => ({
      businessName: form.businessName || "Your Business",
      businessInfo: businessInfo || "Add your business details in the builder.",
      supportPhone: form.supportPhone || "(555) 000-0000",
      supportEmail: form.supportEmail || "",
      payNowUrl: form.payNowUrl,
      quickReplies: form.quickReplies.filter(Boolean).slice(0, 8),
      brandColor: form.brandColor,
      chatTheme: form.chatTheme || "light",
      industry: form.industry || "other",
      mascotName: form.mascotName,
    }),
    [form, businessInfo]
  );

  const fieldValid = (key, validator) =>
    showValidation && !errors[key] && validator(form) === null;

  const handleContinue = () => {
    const result = validateStep(step, form);
    if (!result.valid) {
      setAttemptedStep(step);
      setErrors(result.errors);
      setSummary(result.summary);
      return;
    }
    setAttemptedStep(null);
    setErrors({});
    setSummary([]);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setAttemptedStep(null);
    setErrors({});
    setSummary([]);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleStripeCheckout = () => {
    const result = validateStep(6, form);
    if (!result.valid) {
      setAttemptedStep(6);
      setErrors(result.errors);
      setSummary(result.summary);
      return;
    }
    const params = new URLSearchParams({
      client_reference_id: form.businessName.slice(0, 40),
      prefilled_email: form.supportEmail,
    });
    window.open(`${STRIPE_PAYMENT_LINK}?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const descLen = form.businessDescription.trim().length;
  const svcLen = form.servicesDescription.trim().length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37] text-sm font-black text-[#0A0A0A]">
              V
            </span>
            VestaChatHost Builder
          </Link>
          <Link href="/" className="text-sm font-medium text-[#a3a3a3] hover:text-[#F0D060]">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {step === 1 && "Tell us about your business"}
            {step === 2 && "Business details & support"}
            {step === 3 && "Brand & quick replies"}
            {step === 4 && "Meet your mascot"}
            {step === 5 && "Preview your chatbot"}
            {step === 6 && "Launch your chatbot"}
          </h1>
          <p className="mt-2 text-[#a3a3a3]">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        <StepIndicator current={step} />

        <div className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 shadow-sm sm:p-8">
          <ErrorSummary summary={summary} show={showValidation} />

          {step === 1 && (
            <div className="space-y-6">
              <FormField
                label="Business name"
                htmlFor="business-name"
                showValidation={showValidation}
                error={errors.businessName}
                isValid={fieldValid("businessName", (f) => validateBusinessName(f.businessName))}
              >
                <input
                  id="business-name"
                  type="text"
                  value={form.businessName}
                  onChange={(e) => update({ businessName: e.target.value })}
                  placeholder="e.g. Sunrise Dental Studio"
                  className={inputClassName(
                    showValidation,
                    errors.businessName,
                    fieldValid("businessName", (f) => validateBusinessName(f.businessName))
                  )}
                />
              </FormField>
              <IndustrySelector
                value={form.industry}
                customQACount={form.customQA.length}
                onChange={(patch) => update(patch)}
                showValidation={showValidation}
                error={errors.industry}
                isValid={fieldValid("industry", (f) => validateIndustry(f.industry))}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <FormField
                label="Business description"
                htmlFor="business-description"
                showValidation={showValidation}
                error={errors.businessDescription}
                isValid={fieldValid("businessDescription", (f) =>
                  validateBusinessDescription(f.businessDescription)
                )}
                counter={
                  <span
                    className={`text-xs ${descLen >= 50 ? "text-green-400" : "text-[#a3a3a3]"}`}
                  >
                    {descLen}/50
                  </span>
                }
              >
                <textarea
                  id="business-description"
                  rows={4}
                  value={form.businessDescription}
                  onChange={(e) => update({ businessDescription: e.target.value })}
                  placeholder="Tell customers about your business, mission, and what makes you unique…"
                  className={inputClassName(
                    showValidation,
                    errors.businessDescription,
                    fieldValid("businessDescription", (f) =>
                      validateBusinessDescription(f.businessDescription)
                    )
                  )}
                />
              </FormField>

              <FormField
                label="Services"
                htmlFor="services"
                showValidation={showValidation}
                error={errors.servicesDescription}
                isValid={fieldValid("servicesDescription", (f) =>
                  validateServicesDescription(f.servicesDescription)
                )}
                counter={
                  <span
                    className={`text-xs ${svcLen >= 20 ? "text-green-400" : "text-[#a3a3a3]"}`}
                  >
                    {svcLen}/20
                  </span>
                }
              >
                <textarea
                  id="services"
                  rows={3}
                  value={form.servicesDescription}
                  onChange={(e) => update({ servicesDescription: e.target.value })}
                  placeholder="List your main services, packages, or specialties…"
                  className={inputClassName(
                    showValidation,
                    errors.servicesDescription,
                    fieldValid("servicesDescription", (f) =>
                      validateServicesDescription(f.servicesDescription)
                    )
                  )}
                />
              </FormField>

              <BusinessHoursEditor
                hours={form.businessHours}
                onChange={(businessHours) => update({ businessHours })}
              />

              <AddressInput
                address={form.address}
                onChange={(address) => update({ address })}
                showValidation={showValidation}
                errors={errors}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Support phone"
                  htmlFor="support-phone"
                  showValidation={showValidation}
                  error={errors.supportPhone}
                  isValid={fieldValid("supportPhone", (f) => validatePhone(f.supportPhone))}
                >
                  <input
                    id="support-phone"
                    type="tel"
                    value={form.supportPhone}
                    onChange={(e) => update({ supportPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className={inputClassName(
                      showValidation,
                      errors.supportPhone,
                      fieldValid("supportPhone", (f) => validatePhone(f.supportPhone))
                    )}
                  />
                </FormField>
                <FormField
                  label="Support email"
                  htmlFor="support-email"
                  showValidation={showValidation}
                  error={errors.supportEmail}
                  isValid={fieldValid("supportEmail", (f) => validateEmail(f.supportEmail))}
                >
                  <input
                    id="support-email"
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => update({ supportEmail: e.target.value })}
                    placeholder="support@yourbusiness.com"
                    className={inputClassName(
                      showValidation,
                      errors.supportEmail,
                      fieldValid("supportEmail", (f) => validateEmail(f.supportEmail))
                    )}
                  />
                </FormField>
              </div>

              <FormField
                label="Payment link (optional)"
                htmlFor="pay-url"
                showValidation={showValidation}
                error={errors.payNowUrl}
                isValid={
                  showValidation &&
                  !errors.payNowUrl &&
                  (!form.payNowUrl.trim() ||
                    validateHttpsUrl(form.payNowUrl) === null)
                }
                hint="Must start with https:// if provided"
              >
                <input
                  id="pay-url"
                  type="url"
                  value={form.payNowUrl}
                  onChange={(e) => update({ payNowUrl: e.target.value })}
                  placeholder="https://yourbusiness.com/pay"
                  className={inputClassName(
                    showValidation,
                    errors.payNowUrl,
                    showValidation &&
                      !errors.payNowUrl &&
                      form.payNowUrl.trim() &&
                      validateHttpsUrl(form.payNowUrl, { label: "Payment link" }) === null
                  )}
                />
              </FormField>

              {businessInfo && (
                <div className="rounded-xl border border-[#D4AF37]/20 bg-[#111111] p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
                    AI preview
                  </p>
                  <p className="text-xs leading-relaxed text-[#a3a3a3]">{businessInfo}</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <BrandColorPicker
                value={form.brandColor}
                onChange={(brandColor) => update({ brandColor })}
                showValidation={showValidation}
                error={errors.brandColor}
                isValid={fieldValid("brandColor", (f) => validateBrandColor(f.brandColor))}
              />
              <ChatThemeSelector
                value={form.chatTheme}
                brandColor={form.brandColor}
                onChange={(chatTheme) => update({ chatTheme })}
              />
              <QuickRepliesEditor
                industry={form.industry || "other"}
                quickReplies={form.quickReplies}
                onChange={(quickReplies) => update({ quickReplies })}
                customQA={form.customQA}
                onCustomQAChange={(customQA) => update({ customQA })}
                showValidation={showValidation}
                fieldErrors={errors}
              />
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
              <div
                className={`flex flex-col items-center rounded-2xl border bg-[#111111] p-8 ${
                  showValidation && errors.industry
                    ? "border-red-500/50"
                    : "border-[#D4AF37]/20"
                }`}
              >
                {form.industry ? (
                  <MascotCharacter industry={form.industry} animation="bounce" size={120} />
                ) : (
                  <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#0A0A0A] text-[#a3a3a3]">
                    ?
                  </div>
                )}
                <p className="mt-4 text-sm font-medium text-[#F0D060]">
                  {form.industry
                    ? `${INDUSTRY_LABELS[form.industry]} mascot`
                    : "Select an industry in Step 1"}
                </p>
              </div>
              <div className="flex-1 space-y-4">
                {showValidation && errors.industry && (
                  <p className="text-sm text-red-400" role="alert">
                    {errors.industry}
                  </p>
                )}
                <p className="text-sm text-[#a3a3a3]">
                  Give your mascot a friendly name. It appears in the chat header and helps your
                  brand feel personal.
                </p>
                <FormField
                  label="Mascot name"
                  htmlFor="mascot-name"
                  showValidation={showValidation}
                  error={errors.mascotName}
                  isValid={fieldValid("mascotName", (f) => validateMascotName(f.mascotName))}
                >
                  <input
                    id="mascot-name"
                    type="text"
                    value={form.mascotName}
                    onChange={(e) => update({ mascotName: e.target.value })}
                    placeholder="e.g. Smiley, Coach Max, Leafy"
                    maxLength={20}
                    className={inputClassName(
                      showValidation,
                      errors.mascotName,
                      fieldValid("mascotName", (f) => validateMascotName(f.mascotName))
                    )}
                  />
                </FormField>
                <p className="rounded-lg bg-[#111111] p-4 text-xs text-[#a3a3a3]">
                  Letters and spaces only · 2–20 characters
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="mb-6 text-center text-sm text-[#a3a3a3]">
                This is how customers will see your chatbot on your website.
              </p>
              <div
                className={`relative mx-auto min-h-[520px] max-w-md overflow-hidden rounded-2xl border border-[#D4AF37]/25 p-4 ${
                  form.chatTheme === "glass"
                    ? "bg-gradient-to-br from-slate-600 via-slate-800 to-slate-900"
                    : "bg-[#111111]"
                }`}
              >
                <ChatWidget key={JSON.stringify(chatConfig)} config={chatConfig} defaultOpen embedded />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="mx-auto max-w-md space-y-6 text-center">
              <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111] p-6">
                <MascotCharacter industry={form.industry || "other"} animation="celebrate" size={80} />
                <h2 className="mt-4 text-xl font-bold text-white">
                  Almost there, {form.mascotName} is ready to go!
                </h2>
                <p className="mt-2 text-sm text-[#a3a3a3]">
                  Enter your website URL, then complete payment to activate your VestaChatHost
                  chatbot.
                </p>
              </div>
              <div className="text-left">
                <FormField
                  label="Your website URL"
                  htmlFor="website-url"
                  showValidation={showValidation}
                  error={errors.websiteUrl}
                  isValid={fieldValid("websiteUrl", (f) => validateWebsiteUrl(f.websiteUrl))}
                >
                  <input
                    id="website-url"
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => update({ websiteUrl: e.target.value })}
                    placeholder="https://yourbusiness.com"
                    className={inputClassName(
                      showValidation,
                      errors.websiteUrl,
                      fieldValid("websiteUrl", (f) => validateWebsiteUrl(f.websiteUrl))
                    )}
                  />
                </FormField>
              </div>
              <button
                type="button"
                onClick={handleStripeCheckout}
                className="w-full rounded-xl bg-[#635bff] px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-[#5851e0]"
              >
                Subscribe with Stripe
              </button>
              <p className="text-xs text-[#a3a3a3]">
                Set <code className="rounded bg-[#1A1A1A] px-1 text-[#F0D060]">NEXT_PUBLIC_STRIPE_PAYMENT_LINK</code>{" "}
                in your environment for your live Stripe Payment Link.
              </p>
            </div>
          )}

          <div className="mt-10 flex justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-medium text-[#a3a3a3] transition hover:bg-[#111111] disabled:opacity-40"
            >
              Back
            </button>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-bold text-[#0A0A0A] transition hover:bg-[#F0D060]"
              >
                Continue
              </button>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
