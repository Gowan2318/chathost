"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { buildChatbotConfig } from "../../lib/chatbot-config";
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
import { getSupabaseClient } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

const STRIPE_CHECKOUT_LINKS = {
  basic: "https://buy.stripe.com/eVq8wO5g06j56rU73BdfG00",
  pro: "https://buy.stripe.com/00w28qcIsbDp4jMgEbdfG01",
};

const PLAN_META = {
  basic: { label: "Basic Plan", price: "$40/mo" },
  pro:   { label: "Pro Plan",   price: "$60/mo" },
};

function buildStripeCheckoutUrl(baseLink, clientReferenceId, email) {
  const url = new URL(baseLink);
  url.searchParams.set("client_reference_id", clientReferenceId);
  url.searchParams.set("prefilled_email", email);
  url.searchParams.set("prefilled_promo_code", "FOUNDING20");
  return url.toString();
}

const INITIAL = {
  businessName: "",
  industry: "",
  businessDescription: "",
  servicesDescription: "",
  businessHours: createDefaultBusinessHours(),
  address: { street: "", city: "", state: "", zip: "" },
  supportPhone: "",
  supportEmail: "",
  bookingUrl: "",
  payNowUrl: "",
  brandColor: "#0D7377",
  chatTheme: "light",
  quickReplies: [],
  customQA: [],
  mascotName: "",
  websiteUrl: "",
  // Industry-specific fields (Pro only)
  menuUrl: "",
  reservationLink: "",
  hasDelivery: false,
  dietaryOptions: "",
  insurancePlans: "",
  newPatientFormUrl: "",
  hasPaymentPlans: false,
  walkInsWelcome: false,
  servicesPricing: "",
  membershipUrl: "",
  hasFreeTrial: false,
  classScheduleUrl: "",
  practiceAreas: "",
  freeConsultation: false,
  worksOnContingency: false,
  serviceArea: "",
  freeEstimates: false,
  recurringPlans: false,
  clientType: "both",
  areasServed: "",
  extraInfo: "",
};

function Toggle({ label, hint, checked, onChange }) {
  return (
    <div
      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3"
      onClick={() => onChange(!checked)}
    >
      <div>
        <span className="text-sm font-medium text-[#1A1A2E]">{label}</span>
        {hint && <p className="mt-0.5 text-xs text-[#9CA3AF]">{hint}</p>}
      </div>
      <div className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? "bg-[#0D7377]" : "bg-[#CBD5E0]"}`}>
        <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </div>
  );
}

// current = visual step (1-based, already accounting for skipped steps)
// total   = total visual steps for this plan
function StepIndicator({ current, total }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
              n === current
                ? "bg-[#0D7377] text-white shadow-md shadow-[#0D7377]/30"
                : n < current
                  ? "bg-[#0D7377]/15 text-[#0D7377]"
                  : "bg-[#E2E8F0] text-[#4A5568]"
            }`}
          >
            {n}
          </div>
          {n < total && (
            <div
              className={`hidden h-0.5 w-6 sm:block md:w-10 ${
                n < current ? "bg-[#0D7377]/40" : "bg-[#E2E8F0]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const BASIC_FEATURES = [
  "AI chatbot on your website",
  "Answers customer questions 24/7",
  "8 quick reply buttons",
  "Support contact fallback",
  "24/7 availability",
  "Self-service setup",
];

const PRO_FEATURES = [
  "Everything in Basic",
  "Custom mascot name",
  "Appointment booking flow",
  "Pay Now button",
  "Custom brand color",
  "Dark / light / glass theme choice",
  "Priority support",
];

export default function BuilderPageClient() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const preselectedPlan = planParam === "basic" || planParam === "pro" ? planParam : null;

  const [step, setStep] = useState(preselectedPlan ? 1 : 0);
  const [form, setForm] = useState(INITIAL);
  const [attemptedStep, setAttemptedStep] = useState(null);
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan ?? "pro");

  // Inline auth panel state (Step 6 only)
  const [authTab, setAuthTab] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const isBasic = selectedPlan === "basic";
  const showValidation = attemptedStep === step;

  // Basic plan has 5 visual steps (internal step 4 — mascot — is skipped).
  // Pro plan has 6 visual steps.
  const totalSteps = isBasic ? 5 : 6;
  // Map internal step → visual step number shown in the indicator and "Step X of Y"
  const visualStep = isBasic && step >= 5 ? step - 1 : step;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const businessInfo = useMemo(() => composeBusinessInfo(form), [form]);

  // Not memoized — must always reflect the latest form.quickReplies so the Step 5
  // preview is never stale after the user edits or removes quick replies in Step 3.
  const chatConfig = {
    businessName: form.businessName || "Your Business",
    businessInfo: businessInfo || "Add your business details in the builder.",
    supportPhone: form.supportPhone || "(555) 000-0000",
    supportEmail: form.supportEmail || "support@yourbusiness.com",
    payNowUrl: form.payNowUrl,
    quickReplies: form.quickReplies.filter(Boolean).slice(0, 8),
    brandColor: form.brandColor,
    chatTheme: form.chatTheme || "light",
    industry: form.industry || "other",
    mascotName: form.mascotName,
  };

  const fieldValid = (key, validator) =>
    showValidation && !errors[key] && validator(form) === null;

  const handleContinue = () => {
    const result = validateStep(step, form, { plan: selectedPlan });
    if (!result.valid) {
      setAttemptedStep(step);
      setErrors(result.errors);
      setSummary(result.summary);
      return;
    }
    setAttemptedStep(null);
    setErrors({});
    setSummary([]);
    window.scrollTo({ top: 0, behavior: "instant" });
    // Basic plan skips step 4 (mascot)
    if (isBasic && step === 3) {
      setStep(5);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setAttemptedStep(null);
    setErrors({});
    setSummary([]);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (step === 1 && preselectedPlan) {
      router.push("/#pricing");
      return;
    }
    // Basic plan skips step 4 (mascot)
    if (isBasic && step === 5) {
      setStep(3);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const handleChoosePlan = (plan) => {
    setSelectedPlan(plan);
    setStep(1);
  };

  const handleInlineAuth = async () => {
    setAuthError("");
    if (authTab === "signup") {
      if (authPassword.length < 8) {
        setAuthError("Password must be at least 8 characters.");
        return;
      }
      if (authPassword !== authConfirm) {
        setAuthError("Passwords do not match.");
        return;
      }
    }
    setAuthLoading(true);
    const supabase = getSupabaseClient();
    const { error } = authTab === "login"
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword });
    setAuthLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setAuthError("An account with this email already exists. Try logging in.");
      } else {
        setAuthError(error.message);
      }
    }
    // On success, onAuthStateChange in AuthContext updates `user` automatically.
  };

  const handleStripeCheckout = async () => {
    const result = validateStep(6, form, { plan: selectedPlan });
    if (!result.valid) {
      setAttemptedStep(6);
      setErrors(result.errors);
      setSummary(result.summary);
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();
      const newClientId = crypto.randomUUID();
      const formForConfig = isBasic
        ? { ...form, industry: form.industry || "other" }
        : form;
      const config = buildChatbotConfig(formForConfig, businessInfo);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch("/api/save-chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ clientId: newClientId, config, plan: selectedPlan }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not save your chatbot configuration.");
      }

      const checkoutUrl = buildStripeCheckoutUrl(
        STRIPE_CHECKOUT_LINKS[selectedPlan],
        newClientId,
        form.supportEmail
      );
      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error("Failed to save chatbot config:", err);
      setSaveError(
        err?.message || "Could not save your chatbot configuration. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const descLen = form.businessDescription.trim().length;
  const svcLen = form.servicesDescription.trim().length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A2E]">
      <header className="border-b border-[#E2E8F0] bg-white/95 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-[#1A1A2E]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D7377] text-sm font-black text-white shadow-md">
              V
            </span>
            <span className="text-[#1A1A2E]">Vesta<span className="text-[#0D7377]">Chat</span>Host Builder</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-[#4A5568] transition hover:text-[#0D7377]">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            {step === 0 && "Choose your plan"}
            {step === 1 && "Tell us about your business"}
            {step === 2 && "Business details & support"}
            {step === 3 && "Brand & quick replies"}
            {step === 4 && "Meet your mascot"}
            {step === 5 && "Preview your chatbot"}
            {step === 6 && "Launch your chatbot"}
          </h1>
          {step === 0 ? (
            <p className="mt-2 text-[#4A5568]">
              No payment until the final step — select the right plan to get started
            </p>
          ) : (
            <p className="mt-2 text-[#4A5568]">
              Step {visualStep} of {totalSteps}
            </p>
          )}
        </div>

        {step >= 1 && <StepIndicator current={visualStep} total={totalSteps} />}

        {/* ── Step 0: Plan Selection ── */}
        {step === 0 && (
          <div>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Basic */}
              <div className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-8 transition-all hover:border-[#0D7377] hover:-translate-y-0.5 hover:shadow-lg">
                <h3 className="text-xl font-bold text-[#1A1A2E]">Basic Plan</h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-[#9CA3AF] line-through">$40/mo</span>
                  <span className="rounded-full bg-[#0D7377]/15 px-2 py-0.5 text-xs font-bold text-[#0D7377]">
                    20% OFF
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold text-[#0D7377]">
                  $32<span className="text-base font-normal text-[#4A5568]">/mo</span>
                </p>
                <p className="mt-1 text-xs text-[#0D7377]">with code FOUNDING20</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-[#4A5568]">
                  {BASIC_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0D7377]/15 text-xs text-[#0D7377]">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleChoosePlan("basic")}
                  className="mt-8 w-full rounded-xl border border-[#0D7377] py-3 text-sm font-bold text-[#0D7377] transition hover:bg-[#E8F4F4]"
                >
                  Choose Basic
                </button>
              </div>

              {/* Pro */}
              <div className="relative flex flex-col rounded-2xl border border-[#1A1A2E] bg-[#1A1A2E] p-8 shadow-2xl">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0D7377] px-4 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </span>
                <h3 className="text-xl font-bold text-white">Pro Plan</h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-white/40 line-through">$60/mo</span>
                  <span className="rounded-full bg-[#0D7377] px-2.5 py-0.5 text-xs font-bold text-white">
                    20% OFF
                  </span>
                </div>
                <p className="mt-1 text-3xl font-bold text-white">
                  $48<span className="text-base font-normal text-white/60">/mo</span>
                </p>
                <p className="mt-1 text-xs text-white/50">with code FOUNDING20</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0D7377]/30 text-xs text-[#7DD5D8]">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleChoosePlan("pro")}
                  className="mt-8 w-full rounded-xl border border-white/20 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Choose Pro
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-[#4A5568]">
              🎉 First 100 founding members get 20% off forever — discount auto-applied at checkout
            </p>
          </div>
        )}

        {/* ── Steps 1–6 ── */}
        {step >= 1 && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
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
                {!isBasic && (
                  <IndustrySelector
                    value={form.industry}
                    customQACount={form.customQA.length}
                    onChange={(patch) => update(patch)}
                    showValidation={showValidation}
                    error={errors.industry}
                    isValid={fieldValid("industry", (f) => validateIndustry(f.industry))}
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <FormField
                  label="Business description"
                  htmlFor="business-description"
                  tooltip="A brief overview of your business — what you do and what makes you special. This helps the AI chatbot answer questions about your business accurately."
                  showValidation={showValidation}
                  error={errors.businessDescription}
                  isValid={fieldValid("businessDescription", (f) =>
                    validateBusinessDescription(f.businessDescription)
                  )}
                  counter={
                    <span className={`text-xs ${descLen >= 50 ? "text-green-600" : "text-[#4A5568]"}`}>
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
                  tooltip="List the main services or products you offer, separated by commas. The chatbot will use this to tell customers what you provide."
                  showValidation={showValidation}
                  error={errors.servicesDescription}
                  isValid={fieldValid("servicesDescription", (f) =>
                    validateServicesDescription(f.servicesDescription)
                  )}
                  counter={
                    <span className={`text-xs ${svcLen >= 20 ? "text-green-600" : "text-[#4A5568]"}`}>
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
                  tooltip="Set when you're open each day. The chatbot will tell customers your hours and let them know if you're currently open or closed."
                />

                <AddressInput
                  address={form.address}
                  onChange={(address) => update({ address })}
                  showValidation={showValidation}
                  errors={errors}
                  tooltip="Your business location. The chatbot will share this when customers ask where you're located."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Support phone"
                    htmlFor="support-phone"
                    tooltip="Your business phone number. The chatbot will share this when customers want to talk to someone or need to reach you directly."
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
                    tooltip="Your business email address. The chatbot will share this when customers ask to contact you or need help from your team."
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

                {!isBasic && (
                  <>
                    <FormField
                      label="Appointment Booking Link (Calendly, Square, etc.)"
                      htmlFor="booking-url"
                      tooltip="This is your Calendly link (or similar booking tool). Don't have one? Sign up free at calendly.com, connect your Google/Outlook calendar there, then paste your personal link here. Leave blank if you don't take online bookings."
                      showValidation={showValidation}
                      error={errors.bookingUrl}
                      isValid={
                        showValidation &&
                        !errors.bookingUrl &&
                        (!form.bookingUrl.trim() || validateHttpsUrl(form.bookingUrl) === null)
                      }
                      hint="Customers will be sent here to book appointments. Leave blank if you don't take online bookings yet."
                    >
                      <input
                        id="booking-url"
                        type="url"
                        value={form.bookingUrl}
                        onChange={(e) => update({ bookingUrl: e.target.value })}
                        placeholder="https://calendly.com/yourbusiness"
                        className={inputClassName(
                          showValidation,
                          errors.bookingUrl,
                          showValidation &&
                            !errors.bookingUrl &&
                            form.bookingUrl.trim() &&
                            validateHttpsUrl(form.bookingUrl) === null
                        )}
                      />
                    </FormField>

                    <FormField
                      label="Payment link (optional)"
                      htmlFor="pay-url"
                      tooltip="A link where customers can pay you online (Stripe, PayPal, Square, Venmo, etc.). When customers ask about payment, the chatbot will show this as a 'Pay Now' button."
                      showValidation={showValidation}
                      error={errors.payNowUrl}
                      isValid={
                        showValidation &&
                        !errors.payNowUrl &&
                        (!form.payNowUrl.trim() || validateHttpsUrl(form.payNowUrl) === null)
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
                  </>
                )}

                {/* Industry Details — Pro only, shown after industry is selected */}
                {!isBasic && form.industry && (
                  <div className="space-y-4 rounded-xl border border-[#0D7377]/20 bg-[#F0FAF9] p-5">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1A1A2E]">Industry Details</h3>
                      <p className="mt-0.5 text-xs text-[#4A5568]">
                        These details help your chatbot answer industry-specific questions accurately.
                      </p>
                    </div>

                    {form.industry === "restaurant" && (
                      <div className="space-y-4">
                        <FormField label="Menu URL" htmlFor="menu-url" hint="Link to your online menu (e.g. your website menu page)" showValidation={false} error={null} isValid={false}>
                          <input id="menu-url" type="url" value={form.menuUrl} onChange={(e) => update({ menuUrl: e.target.value })} placeholder="https://yourbusiness.com/menu" className={inputClassName(false, null, false)} />
                        </FormField>
                        <FormField label="Reservation link" htmlFor="reservation-link" hint="Link to your reservation system (OpenTable, Resy, etc.)" showValidation={false} error={null} isValid={false}>
                          <input id="reservation-link" type="url" value={form.reservationLink} onChange={(e) => update({ reservationLink: e.target.value })} placeholder="https://opentable.com/yourbusiness" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer delivery or takeout?" checked={form.hasDelivery} onChange={(v) => update({ hasDelivery: v })} />
                        <FormField label="Dietary options available" htmlFor="dietary-options" hint="e.g. Vegetarian, Vegan, Gluten-free, Halal" showValidation={false} error={null} isValid={false}>
                          <textarea id="dietary-options" rows={2} value={form.dietaryOptions} onChange={(e) => update({ dietaryOptions: e.target.value })} placeholder="e.g. Vegetarian, Vegan, Gluten-free, Halal" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}

                    {form.industry === "dental" && (
                      <div className="space-y-4">
                        <FormField label="Insurance plans accepted" htmlFor="insurance-plans" hint="e.g. Delta Dental, Cigna, MetLife, or 'We do not accept insurance'" showValidation={false} error={null} isValid={false}>
                          <textarea id="insurance-plans" rows={2} value={form.insurancePlans} onChange={(e) => update({ insurancePlans: e.target.value })} placeholder="e.g. Delta Dental, Cigna, MetLife" className={inputClassName(false, null, false)} />
                        </FormField>
                        <FormField label="New patient form URL" htmlFor="new-patient-form" hint="Link to your new patient intake form if you have one" showValidation={false} error={null} isValid={false}>
                          <input id="new-patient-form" type="url" value={form.newPatientFormUrl} onChange={(e) => update({ newPatientFormUrl: e.target.value })} placeholder="https://yourbusiness.com/new-patient" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer payment plans?" checked={form.hasPaymentPlans} onChange={(v) => update({ hasPaymentPlans: v })} />
                      </div>
                    )}

                    {(form.industry === "salon" || form.industry === "barber") && (
                      <div className="space-y-4">
                        <Toggle label="Do you accept walk-ins?" checked={form.walkInsWelcome} onChange={(v) => update({ walkInsWelcome: v })} />
                        <FormField label="Services & pricing" htmlFor="services-pricing" hint="List your main services and prices, e.g. Haircut $35, Color $80+" showValidation={false} error={null} isValid={false}>
                          <textarea id="services-pricing" rows={3} value={form.servicesPricing} onChange={(e) => update({ servicesPricing: e.target.value })} placeholder="e.g. Haircut $35, Color $80+, Blowout $45" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}

                    {form.industry === "gym" && (
                      <div className="space-y-4">
                        <FormField label="Membership page URL" htmlFor="membership-url" hint="Link to your memberships/pricing page (e.g. your website's membership section)" showValidation={false} error={null} isValid={false}>
                          <input id="membership-url" type="url" value={form.membershipUrl} onChange={(e) => update({ membershipUrl: e.target.value })} placeholder="https://yourgym.com/memberships" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer a free trial or guest pass?" checked={form.hasFreeTrial} onChange={(v) => update({ hasFreeTrial: v })} />
                        <FormField label="Class schedule URL" htmlFor="class-schedule-url" hint="Link to your class schedule if available" showValidation={false} error={null} isValid={false}>
                          <input id="class-schedule-url" type="url" value={form.classScheduleUrl} onChange={(e) => update({ classScheduleUrl: e.target.value })} placeholder="https://yourgym.com/schedule" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}

                    {form.industry === "law" && (
                      <div className="space-y-4">
                        <FormField label="Practice areas" htmlFor="practice-areas" hint="e.g. Personal injury, Family law, Criminal defense" showValidation={false} error={null} isValid={false}>
                          <textarea id="practice-areas" rows={2} value={form.practiceAreas} onChange={(e) => update({ practiceAreas: e.target.value })} placeholder="e.g. Personal injury, Family law, Criminal defense" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer free consultations?" checked={form.freeConsultation} onChange={(v) => update({ freeConsultation: v })} />
                        <Toggle label="Do you work on contingency?" checked={form.worksOnContingency} onChange={(v) => update({ worksOnContingency: v })} />
                      </div>
                    )}

                    {form.industry === "lawn" && (
                      <div className="space-y-4">
                        <FormField label="Service area" htmlFor="service-area" hint="e.g. We service Pittsburgh and surrounding suburbs within 20 miles" showValidation={false} error={null} isValid={false}>
                          <textarea id="service-area" rows={2} value={form.serviceArea} onChange={(e) => update({ serviceArea: e.target.value })} placeholder="e.g. Pittsburgh and surrounding suburbs within 20 miles" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer free estimates?" checked={form.freeEstimates} onChange={(v) => update({ freeEstimates: v })} />
                        <Toggle label="Do you offer recurring service plans?" checked={form.recurringPlans} onChange={(v) => update({ recurringPlans: v })} />
                      </div>
                    )}

                    {form.industry === "real_estate" && (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-sm font-medium text-[#1A1A2E]">Who do you work with?</p>
                          <div className="flex gap-3">
                            {[
                              { value: "buyers", label: "Buyers" },
                              { value: "sellers", label: "Sellers" },
                              { value: "both", label: "Both" },
                            ].map(({ value, label }) => (
                              <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${form.clientType === value ? "border-[#0D7377] bg-[#0D7377]/10 text-[#0D7377]" : "border-[#E2E8F0] bg-white text-[#4A5568]"}`}>
                                <input type="radio" name="client-type" value={value} checked={form.clientType === value} onChange={() => update({ clientType: value })} className="sr-only" />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <FormField label="Areas served" htmlFor="areas-served" hint="e.g. Pittsburgh, Mt. Lebanon, Bethel Park" showValidation={false} error={null} isValid={false}>
                          <textarea id="areas-served" rows={2} value={form.areasServed} onChange={(e) => update({ areasServed: e.target.value })} placeholder="e.g. Pittsburgh, Mt. Lebanon, Bethel Park" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}

                    {form.industry === "other" && (
                      <FormField label="Additional business information" htmlFor="extra-info" hint="Add any extra details your chatbot should know to answer customer questions" showValidation={false} error={null} isValid={false}>
                        <textarea id="extra-info" rows={4} value={form.extraInfo} onChange={(e) => update({ extraInfo: e.target.value })} placeholder="Add any extra details your chatbot should know…" className={inputClassName(false, null, false)} />
                      </FormField>
                    )}
                  </div>
                )}

                {businessInfo && (
                  <div className="rounded-xl border border-[#0D7377]/20 bg-[#E8F4F4] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#0D7377]">
                      AI preview
                    </p>
                    <p className="text-xs leading-relaxed text-[#4A5568]">{businessInfo}</p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                {!isBasic && (
                  <>
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
                  </>
                )}
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

            {/* Step 4 is Pro-only — Basic users jump from step 3 directly to step 5 */}
            {step === 4 && (
              <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
                <div
                  className={`flex flex-col items-center rounded-2xl border bg-[#F8F9FA] p-8 ${
                    showValidation && errors.industry
                      ? "border-red-400"
                      : "border-[#E2E8F0]"
                  }`}
                >
                  {form.industry ? (
                    <MascotCharacter industry={form.industry} animation="bounce" size={120} />
                  ) : (
                    <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#E2E8F0] text-[#4A5568]">
                      ?
                    </div>
                  )}
                  <p className="mt-4 text-sm font-medium text-[#0D7377]">
                    {form.industry
                      ? `${INDUSTRY_LABELS[form.industry]} mascot`
                      : "Select an industry in Step 1"}
                  </p>
                </div>
                <div className="flex-1 space-y-4">
                  {showValidation && errors.industry && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.industry}
                    </p>
                  )}
                  <p className="text-sm text-[#4A5568]">
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
                  <p className="rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] p-4 text-xs text-[#4A5568]">
                    Letters and spaces only · 2–20 characters
                  </p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <p className="mb-6 text-center text-sm font-medium text-[#4A5568]">
                  This is how customers will see your chatbot on your website.
                </p>
                {/* Device mockup frame */}
                <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border-2 border-[#E2E8F0] shadow-2xl">
                  {/* Mock browser chrome */}
                  <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F0F4F8] px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-400/70" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
                    <span className="h-3 w-3 rounded-full bg-green-400/70" />
                    <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1 text-xs text-[#9CA3AF]">
                      {form.websiteUrl || "yourbusiness.com"}
                    </div>
                  </div>
                  {/* Page canvas */}
                  <div
                    className={`relative min-h-[500px] p-6 ${
                      form.chatTheme === "glass"
                        ? "bg-gradient-to-br from-slate-600 via-slate-800 to-slate-900"
                        : "bg-[#F0F4F8]"
                    }`}
                  >
                    {/* Fake page content lines */}
                    {form.chatTheme !== "glass" && (
                      <div className="space-y-3 opacity-30">
                        <div className="h-4 w-2/3 rounded bg-[#CBD5E0]" />
                        <div className="h-3 w-full rounded bg-[#CBD5E0]" />
                        <div className="h-3 w-5/6 rounded bg-[#CBD5E0]" />
                        <div className="h-3 w-4/5 rounded bg-[#CBD5E0]" />
                      </div>
                    )}
                    <ChatWidget key={JSON.stringify(chatConfig)} config={chatConfig} defaultOpen embedded />
                  </div>
                </div>
                <p className="mt-4 text-center text-xs text-[#9CA3AF]">
                  The chat bubble sits in the bottom-right corner of your website
                </p>
              </div>
            )}

            {step === 6 && (
              <div className="mx-auto max-w-md space-y-6 text-center">
                {/* Plan summary */}
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-5 py-4 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">
                    Your chosen plan
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#1A1A2E]">
                    {PLAN_META[selectedPlan].label} —{" "}
                    <span className="text-[#0D7377]">{PLAN_META[selectedPlan].price}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] p-6">
                  <MascotCharacter industry={form.industry || "other"} animation="celebrate" size={80} />
                  <h2 className="mt-4 text-xl font-bold text-[#1A1A2E]">
                    Almost there{form.mascotName ? `, ${form.mascotName} is ready to go` : ""}!
                  </h2>
                  <p className="mt-2 text-sm text-[#4A5568]">
                    Enter your website URL, then complete payment to activate your VestaChatHost chatbot.
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

                {/* ── Auth panel (shown only when logged out) ── */}
                {!user && (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-left shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-[#1A1A2E]">
                      Create an account or log in to save your chatbot and continue to payment
                    </p>

                    <div className="mb-5 flex rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-1">
                      {["login", "signup"].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => { setAuthTab(tab); setAuthError(""); }}
                          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                            authTab === tab
                              ? "bg-[#0D7377] text-white shadow-sm"
                              : "text-[#4A5568] hover:text-[#1A1A2E]"
                          }`}
                        >
                          {tab === "login" ? "Log In" : "Sign Up"}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#4A5568]">Email</label>
                        <input
                          type="text"
                          inputMode="email"
                          autoComplete="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#4A5568]">Password</label>
                        <input
                          type="password"
                          autoComplete={authTab === "login" ? "current-password" : "new-password"}
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder={authTab === "signup" ? "At least 8 characters" : "Your password"}
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20"
                        />
                      </div>
                      {authTab === "signup" && (
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-[#4A5568]">Confirm password</label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={authConfirm}
                            onChange={(e) => setAuthConfirm(e.target.value)}
                            placeholder="Repeat your password"
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20"
                          />
                        </div>
                      )}
                      {authError && (
                        <p className="rounded-xl border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-600">
                          {authError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleInlineAuth}
                        disabled={authLoading}
                        className="w-full rounded-xl bg-[#0D7377] py-3 text-sm font-bold text-white shadow-md shadow-[#0D7377]/20 transition hover:bg-[#0A5D61] disabled:opacity-50"
                      >
                        {authLoading
                          ? (authTab === "login" ? "Signing in…" : "Creating account…")
                          : (authTab === "login" ? "Sign In" : "Create Account")}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Logged-in confirmation ── */}
                {user && (
                  <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3 text-left">
                    <p className="text-sm text-[#4A5568]">
                      Logged in as <span className="font-medium text-[#1A1A2E]">{user.email}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="text-xs text-[#0D7377] transition hover:text-[#0A5D61]"
                    >
                      Not you? Sign out
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStripeCheckout}
                  disabled={isSaving || !user}
                  className="w-full rounded-xl bg-[#635bff] px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-[#5851e0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Subscribe with Stripe"}
                </button>
                {!user && (
                  <p className="text-xs text-[#4A5568]">Sign in or create an account above to continue.</p>
                )}
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                <p className="text-xs text-[#4A5568]">
                  By subscribing, you agree to our{" "}
                  <Link href="/terms" className="text-[#0D7377] hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-[#0D7377] hover:underline">Privacy Policy</Link>.
                </p>
                <p className="text-xs text-[#4A5568]">
                  Your FOUNDING20 discount is applied automatically at checkout.
                </p>
              </div>
            )}

            <div className="mt-10 flex justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-[#E2E8F0] px-6 py-2.5 text-sm font-medium text-[#4A5568] transition hover:bg-[#F8F9FA]"
              >
                Back
              </button>
              {step < 6 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="rounded-xl bg-[#0D7377] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#0A5D61]"
                >
                  Continue
                </button>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
