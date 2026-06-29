"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AddressInput from "../../components/builder/AddressInput";
import BrandColorPicker from "../../components/builder/BrandColorPicker";
import ChatThemeSelector from "../../components/builder/ChatThemeSelector";
import BusinessHoursEditor from "../../components/builder/BusinessHoursEditor";
import { ErrorSummary, FormField, inputClassName } from "../../components/builder/FormField";
import IndustrySelector from "../../components/builder/IndustrySelector";
import InsuranceSelector from "../../components/builder/InsuranceSelector";
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
  // Restaurant
  menuUrl: "",
  hasReservations: false,
  reservationLink: "",
  hasDelivery: false,
  dietaryOptions: "",
  priceRange: "",
  // Dental
  acceptingNewPatients: false,
  insurancePlans: [],
  hasPaymentPlans: false,
  newPatientFormUrl: "",
  // Salon / Barber / Lawncare / Other
  walkInsWelcome: false,
  servicesPricing: "",
  // Salon
  hasGiftCards: false,
  // Barber
  hasBeardTrim: false,
  // Gym
  membershipUrl: "",
  hasFreeTrial: false,
  hasClasses: false,
  classScheduleUrl: "",
  hasTrainers: false,
  equipmentInfo: "",
  // Law + Real estate
  feesInfo: "",
  // Law
  practiceAreas: "",
  freeConsultation: false,
  worksOnContingency: false,
  caseTimeline: "",
  // Lawncare
  serviceArea: "",
  freeEstimates: false,
  recurringPlans: false,
  isLicensed: false,
  // Real estate
  clientType: "both",
  areasServed: "",
  listingsUrl: "",
  acceptingClients: false,
  // Other
  extraInfo: "",
  paymentInfo: "",
  // Website knowledge (auto-populated from import)
  socialLinks: null,
  promotions: "",
  upcomingEvents: "",
  websiteKnowledge: "",
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
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-[#0D7377]" : "bg-[#CBD5E0]"}`}>
          <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
        </div>
        <span className={`w-6 text-sm font-medium ${checked ? "text-[#0D7377]" : "text-[#9CA3AF]"}`}>
          {checked ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
}

function SectionBlock({ title, summary, expanded, onToggle, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-white px-5 py-4 transition hover:bg-[#F8F9FA]"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-[#1A1A2E]">{title}</p>
          {!expanded && summary && (
            <p className="mt-0.5 max-w-xs truncate text-xs text-[#4A5568]">{summary}</p>
          )}
        </div>
        <span className="ml-4 shrink-0 text-xs font-semibold text-[#0D7377]">
          {expanded ? "Done ↑" : "Edit ↓"}
        </span>
      </button>
      {expanded && (
        <div className="space-y-5 border-t border-[#E2E8F0] bg-white px-5 pb-6 pt-4">
          {children}
        </div>
      )}
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

  // Website import state (Step 1)
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // null | "success" | "error"
  const [importError, setImportError] = useState("");
  const [importDone, setImportDone] = useState(false);
  const [hoursNote, setHoursNote] = useState("");
  const [pasteText, setPasteText] = useState("");

  // Step 2 accordion expanded state
  const [expandedSections, setExpandedSections] = useState({
    businessInfo: true, contact: true, location: true, hours: false, industryDetails: false,
  });

  // Inline auth panel state (Step 6 only)
  const [authTab, setAuthTab] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const isBasic = selectedPlan === "basic";
  const showValidation = attemptedStep === step;

  // Basic plan has 5 visual steps (step 3 — mascot & branding — is skipped).
  // Pro plan has 6 visual steps.
  const totalSteps = isBasic ? 5 : 6;
  // Map internal step → visual step number shown in the indicator and "Step X of Y"
  const visualStep = isBasic && step >= 4 ? step - 1 : step;

  const update = (patch) => setForm((f) => ({
    ...f,
    ...patch,
    ...(patch.address ? { address: { ...f.address, ...patch.address } } : {}),
  }));

  const businessInfo = useMemo(() => composeBusinessInfo(form), [form]);

  // Not memoized — must always reflect the latest form state so the Step 5
  // preview is never stale. businessInfo is composed fresh so booking URL and
  // industry details are live without requiring a save first.
  const chatConfig = {
    businessName: form.businessName || "Your Business",
    businessInfo: composeBusinessInfo(form) || "Add your business details in the builder.",
    supportPhone: form.supportPhone || "(555) 000-0000",
    supportEmail: form.supportEmail || "support@yourbusiness.com",
    payNowUrl: form.payNowUrl,
    booking_url: form.bookingUrl || "",
    quickReplies: form.quickReplies.filter(Boolean).slice(0, 8),
    customQA: form.customQA,
    brandColor: form.brandColor,
    chatTheme: form.chatTheme || "light",
    industry: form.industry || "other",
    mascotName: form.mascotName,
    // Industry-specific fields — available for live preview logic
    acceptingNewPatients: form.acceptingNewPatients,
    insurancePlans: form.insurancePlans,
    hasPaymentPlans: form.hasPaymentPlans,
    newPatientFormUrl: form.newPatientFormUrl,
    walkInsWelcome: form.walkInsWelcome,
    hasGiftCards: form.hasGiftCards,
    hasBeardTrim: form.hasBeardTrim,
    menuUrl: form.menuUrl,
    hasReservations: form.hasReservations,
    reservationLink: form.reservationLink,
    hasDelivery: form.hasDelivery,
    dietaryOptions: form.dietaryOptions,
    priceRange: form.priceRange,
    membershipUrl: form.membershipUrl,
    hasFreeTrial: form.hasFreeTrial,
    hasClasses: form.hasClasses,
    classScheduleUrl: form.classScheduleUrl,
    hasTrainers: form.hasTrainers,
    equipmentInfo: form.equipmentInfo,
    practiceAreas: form.practiceAreas,
    freeConsultation: form.freeConsultation,
    feesInfo: form.feesInfo,
    worksOnContingency: form.worksOnContingency,
    caseTimeline: form.caseTimeline,
    serviceArea: form.serviceArea,
    freeEstimates: form.freeEstimates,
    recurringPlans: form.recurringPlans,
    isLicensed: form.isLicensed,
    servicesPricing: form.servicesPricing,
    clientType: form.clientType,
    areasServed: form.areasServed,
    listingsUrl: form.listingsUrl,
    acceptingClients: form.acceptingClients,
    extraInfo: form.extraInfo,
    paymentInfo: form.paymentInfo,
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
    if (step === 1) {
      setExpandedSections({
        businessInfo: !(form.businessName.trim() && form.businessDescription.trim()),
        contact: !(form.supportPhone.trim() && form.supportEmail.trim()),
        location: !(form.address.street.trim() && form.address.city.trim() && form.address.state),
        hours: false,
        industryDetails: false,
      });
    }
    // Basic plan skips step 3 (mascot & branding)
    if (isBasic && step === 2) {
      setStep(4);
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
    // Basic plan skips step 3 (mascot & branding)
    if (isBasic && step === 4) {
      setStep(2);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const handleChoosePlan = (plan) => {
    setSelectedPlan(plan);
    setStep(1);
  };

  const INDUSTRY_HINT_MAP = {
    lawncare: "lawn",
    realestate: "real_estate",
  };
  const VALID_INDUSTRIES = new Set([
    "dental", "gym", "salon", "restaurant", "real_estate", "law", "barber", "lawn", "other",
  ]);

  const handleImport = async () => {
    const trimmed = importUrl.trim();
    if (!trimmed || isImporting) return;
    setIsImporting(true);
    setImportStatus(null);
    setImportError("");
    setHoursNote("");
    try {
      const res = await fetch("/api/import-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      const { extracted } = data;
      console.log("[handleImport] extracted:", JSON.stringify(extracted, null, 2));
      const patch = {};

      if (extracted.businessName) patch.businessName = extracted.businessName;
      if (extracted.businessDescription) patch.businessDescription = extracted.businessDescription;
      if (extracted.servicesDescription) patch.servicesDescription = extracted.servicesDescription;
      if (extracted.supportPhone) patch.supportPhone = extracted.supportPhone;
      if (extracted.supportEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extracted.supportEmail)) patch.supportEmail = extracted.supportEmail;
      if (extracted.websiteUrl) patch.websiteUrl = extracted.websiteUrl;

      if (extracted.address && typeof extracted.address === "object") {
        const addr = {};
        if (extracted.address.street) addr.street = extracted.address.street;
        if (extracted.address.city) addr.city = extracted.address.city;
        if (extracted.address.state) addr.state = extracted.address.state;
        if (extracted.address.zip) addr.zip = extracted.address.zip;
        if (Object.keys(addr).length > 0) patch.address = addr;
      }

      if (!form.industry && extracted.industry_hint) {
        const mapped = INDUSTRY_HINT_MAP[extracted.industry_hint] ?? extracted.industry_hint;
        if (VALID_INDUSTRIES.has(mapped)) patch.industry = mapped;
      }

      // Industry-specific field overrides
      if (extracted.hasFreeTrial !== undefined) patch.hasFreeTrial = extracted.hasFreeTrial;
      if (extracted.hasClasses !== undefined) patch.hasClasses = extracted.hasClasses;
      if (extracted.hasTrainers !== undefined) patch.hasTrainers = extracted.hasTrainers;
      if (extracted.hasReservations !== undefined) patch.hasReservations = extracted.hasReservations;
      if (extracted.hasDelivery !== undefined) patch.hasDelivery = extracted.hasDelivery;
      if (extracted.menuUrl) patch.menuUrl = extracted.menuUrl;

      // New fields from multi-page scrape
      if (extracted.bookingUrl && !form.bookingUrl) patch.bookingUrl = extracted.bookingUrl;
      if (extracted.payNowUrl && !form.payNowUrl) patch.payNowUrl = extracted.payNowUrl;
      if (extracted.socialLinks) patch.socialLinks = extracted.socialLinks;
      if (extracted.promotions) patch.promotions = extracted.promotions;
      if (extracted.upcomingEvents) patch.upcomingEvents = extracted.upcomingEvents;
      if (extracted.websiteKnowledge) patch.websiteKnowledge = extracted.websiteKnowledge;

      console.log("[handleImport] patch:", JSON.stringify(patch, null, 2));
      update(patch);

      if (extracted.businessHours) {
        setHoursNote(`Hours found: "${extracted.businessHours}" — please set them manually in the hours section below.`);
      }

      setImportStatus("success");
      setImportDone(true);

      setExpandedSections({
        businessInfo: !!(patch.businessName || patch.businessDescription || patch.servicesDescription),
        contact: !!(patch.supportPhone || patch.supportEmail),
        location: !!(patch.address?.street || patch.address?.city),
        hours: false,
        industryDetails: !!(patch.hasReservations !== undefined || patch.hasDelivery !== undefined || patch.menuUrl),
      });

      // Advance to step 2 so the user can see all pre-filled fields immediately
      setStep(2);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (err) {
      setImportStatus("error");
      setImportError(err.message || "Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteImport = async () => {
    const trimmed = pasteText.trim();
    if (!trimmed || isImporting) return;
    setIsImporting(true);
    setImportError("");
    setHoursNote("");
    try {
      const res = await fetch("/api/import-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      const { extracted } = data;
      const patch = {};

      if (extracted.businessName) patch.businessName = extracted.businessName;
      if (extracted.businessDescription) patch.businessDescription = extracted.businessDescription;
      if (extracted.servicesDescription) patch.servicesDescription = extracted.servicesDescription;
      if (extracted.supportPhone) patch.supportPhone = extracted.supportPhone;
      if (extracted.supportEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extracted.supportEmail)) patch.supportEmail = extracted.supportEmail;
      if (extracted.websiteUrl) patch.websiteUrl = extracted.websiteUrl;

      if (extracted.address && typeof extracted.address === "object") {
        const addr = {};
        if (extracted.address.street) addr.street = extracted.address.street;
        if (extracted.address.city) addr.city = extracted.address.city;
        if (extracted.address.state) addr.state = extracted.address.state;
        if (extracted.address.zip) addr.zip = extracted.address.zip;
        if (Object.keys(addr).length > 0) patch.address = addr;
      }

      if (!form.industry && extracted.industry_hint) {
        const mapped = INDUSTRY_HINT_MAP[extracted.industry_hint] ?? extracted.industry_hint;
        if (VALID_INDUSTRIES.has(mapped)) patch.industry = mapped;
      }

      // Industry-specific field overrides
      if (extracted.hasFreeTrial !== undefined) patch.hasFreeTrial = extracted.hasFreeTrial;
      if (extracted.hasClasses !== undefined) patch.hasClasses = extracted.hasClasses;
      if (extracted.hasTrainers !== undefined) patch.hasTrainers = extracted.hasTrainers;
      if (extracted.hasReservations !== undefined) patch.hasReservations = extracted.hasReservations;
      if (extracted.hasDelivery !== undefined) patch.hasDelivery = extracted.hasDelivery;
      if (extracted.menuUrl) patch.menuUrl = extracted.menuUrl;

      // New fields from multi-page scrape
      if (extracted.bookingUrl && !form.bookingUrl) patch.bookingUrl = extracted.bookingUrl;
      if (extracted.payNowUrl && !form.payNowUrl) patch.payNowUrl = extracted.payNowUrl;
      if (extracted.socialLinks) patch.socialLinks = extracted.socialLinks;
      if (extracted.promotions) patch.promotions = extracted.promotions;
      if (extracted.upcomingEvents) patch.upcomingEvents = extracted.upcomingEvents;
      if (extracted.websiteKnowledge) patch.websiteKnowledge = extracted.websiteKnowledge;

      update(patch);

      if (extracted.businessHours) {
        setHoursNote(`Hours found: "${extracted.businessHours}" — please set them manually in the hours section.`);
      }

      setImportStatus("success");
      setImportDone(true);

      setExpandedSections({
        businessInfo: !!(patch.businessName || patch.businessDescription || patch.servicesDescription),
        contact: !!(patch.supportPhone || patch.supportEmail),
        location: !!(patch.address?.street || patch.address?.city),
        hours: false,
        industryDetails: !!(patch.hasReservations !== undefined || patch.hasDelivery !== undefined || patch.menuUrl),
      });

      // Advance to step 2 so the user can see all pre-filled fields immediately
      setStep(2);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (err) {
      setImportStatus("error");
      setImportError(err.message || "Extraction failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
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
            {step === 1 && "Let's set up your chatbot"}
            {step === 2 && "Review & complete your info"}
            {step === 3 && "Mascot & branding"}
            {step === 4 && "Quick replies"}
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
                <p className="text-center text-sm text-[#4A5568]">
                  Enter your website URL and we&apos;ll automatically pull in your business info — or skip and fill it in manually.
                </p>

                {/* Primary import input */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleImport(); } }}
                    placeholder="https://yourbusiness.com"
                    disabled={isImporting}
                    className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 text-base text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!importUrl.trim() || isImporting}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0D7377] px-6 py-4 text-base font-bold text-white transition hover:bg-[#0A5D61] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Scanning…
                      </>
                    ) : "Build My Chatbot"}
                  </button>
                </div>

                {/* Import result summary */}
                {importStatus === "success" && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <p className="text-sm font-semibold text-green-800">We found your business info!</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-green-700">
                      {form.businessName && <li>Business name: <strong>{form.businessName}</strong></li>}
                      {form.industry && <li>Industry: <strong>{INDUSTRY_LABELS[form.industry] || form.industry}</strong></li>}
                      {form.supportPhone && <li>Phone: <strong>{form.supportPhone}</strong></li>}
                      {form.supportEmail && <li>Email: <strong>{form.supportEmail}</strong></li>}
                      {form.address?.city && <li>Location: <strong>{[form.address.city, form.address.state].filter(Boolean).join(", ")}</strong></li>}
                      {form.businessDescription && <li>Description: <strong>{form.businessDescription.slice(0, 60)}{form.businessDescription.length > 60 ? "…" : ""}</strong></li>}
                    </ul>
                    {hoursNote && (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {hoursNote}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-green-600">
                      Review and complete anything missing in the next step.
                    </p>
                  </div>
                )}

                {importStatus === "error" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {importError || "Couldn’t fetch that website — it may be blocking automated requests."}
                    </div>
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-5">
                      <p className="text-sm font-semibold text-[#1A1A2E]">No problem! Here&apos;s how to import manually:</p>
                      <ol className="mt-2 space-y-1 text-sm text-[#4A5568]">
                        <li>1. Open your website in a new tab</li>
                        <li>2. Press <kbd className="rounded bg-[#E2E8F0] px-1.5 py-0.5 font-mono text-xs">Ctrl+A</kbd> to select all text, then <kbd className="rounded bg-[#E2E8F0] px-1.5 py-0.5 font-mono text-xs">Ctrl+C</kbd> to copy</li>
                        <li>3. Paste it below and we&apos;ll extract your business info</li>
                      </ol>
                      <textarea
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="Paste your website text here..."
                        rows={6}
                        className="mt-4 w-full border border-[#E2E8F0] rounded-lg p-3 text-[#1A1A2E] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377] resize-none"
                      />
                      <button
                        type="button"
                        onClick={handlePasteImport}
                        disabled={!pasteText.trim() || isImporting}
                        className="mt-3 flex items-center gap-2 rounded-xl bg-[#0D7377] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A5D61] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isImporting ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Extracting…
                          </>
                        ) : "Extract from text"}
                      </button>
                    </div>
                  </div>
                )}

                {!importDone && (
                  <p className="text-center text-sm text-[#9CA3AF]">
                    No website yet?{" "}
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="font-medium text-[#0D7377] underline hover:text-[#0A5D61]"
                    >
                      Fill in my info manually
                    </button>
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {/* Import success banner — shown when user was auto-advanced from the import step */}
                {importDone && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <p className="text-sm font-semibold text-green-800">We found your business info!</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-green-700">
                      {form.businessName && <li>Business name: <strong>{form.businessName}</strong></li>}
                      {form.industry && <li>Industry: <strong>{INDUSTRY_LABELS[form.industry] || form.industry}</strong></li>}
                      {form.supportPhone && <li>Phone: <strong>{form.supportPhone}</strong></li>}
                      {form.supportEmail && <li>Email: <strong>{form.supportEmail}</strong></li>}
                      {form.address?.city && <li>Location: <strong>{[form.address.city, form.address.state].filter(Boolean).join(", ")}</strong></li>}
                    </ul>
                    {hoursNote && (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {hoursNote}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-green-600">Review and complete anything missing below.</p>
                  </div>
                )}

                {/* ── Section: Business Info ── */}
                <SectionBlock
                  title="Business Info"
                  summary={[form.businessName, form.industry ? INDUSTRY_LABELS[form.industry] : null].filter(Boolean).join(" · ") || "Required"}
                  expanded={expandedSections.businessInfo}
                  onToggle={() => setExpandedSections((p) => ({ ...p, businessInfo: !p.businessInfo }))}
                >
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
                      className={inputClassName(showValidation, errors.businessName, fieldValid("businessName", (f) => validateBusinessName(f.businessName)))}
                    />
                  </FormField>
                  {!isBasic && (
                    <IndustrySelector
                      value={form.industry}
                      onChange={(patch) => update(patch)}
                      showValidation={showValidation}
                      error={errors.industry}
                      isValid={fieldValid("industry", (f) => validateIndustry(f.industry))}
                    />
                  )}
                  <FormField
                    label="Business description"
                    htmlFor="business-description"
                    tooltip="A brief overview of your business — what you do and what makes you special."
                    showValidation={showValidation}
                    error={errors.businessDescription}
                    isValid={fieldValid("businessDescription", (f) => validateBusinessDescription(f.businessDescription))}
                    counter={<span className={`text-xs ${descLen >= 50 ? "text-green-600" : "text-[#4A5568]"}`}>{descLen}/500</span>}
                  >
                    <textarea
                      id="business-description"
                      rows={4}
                      maxLength={500}
                      value={form.businessDescription}
                      onChange={(e) => update({ businessDescription: e.target.value })}
                      placeholder="Tell customers about your business, mission, and what makes you unique…"
                      className={inputClassName(showValidation, errors.businessDescription, fieldValid("businessDescription", (f) => validateBusinessDescription(f.businessDescription)))}
                    />
                  </FormField>
                  <FormField
                    label="Services"
                    htmlFor="services"
                    tooltip="List the main services or products you offer. The chatbot will use this to answer customer questions."
                    showValidation={showValidation}
                    error={errors.servicesDescription}
                    isValid={fieldValid("servicesDescription", (f) => validateServicesDescription(f.servicesDescription))}
                    counter={<span className={`text-xs ${svcLen >= 20 ? "text-green-600" : "text-[#4A5568]"}`}>{svcLen}/300</span>}
                  >
                    <textarea
                      id="services"
                      rows={3}
                      maxLength={300}
                      value={form.servicesDescription}
                      onChange={(e) => update({ servicesDescription: e.target.value })}
                      placeholder="List your main services, packages, or specialties…"
                      className={inputClassName(showValidation, errors.servicesDescription, fieldValid("servicesDescription", (f) => validateServicesDescription(f.servicesDescription)))}
                    />
                  </FormField>
                </SectionBlock>

                {/* ── Section: Contact & Links ── */}
                <SectionBlock
                  title="Contact & Links"
                  summary={[form.supportPhone, form.supportEmail].filter(Boolean).join(" · ") || "Required"}
                  expanded={expandedSections.contact}
                  onToggle={() => setExpandedSections((p) => ({ ...p, contact: !p.contact }))}
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      label="Support phone"
                      htmlFor="support-phone"
                      tooltip="Your business phone number."
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
                        className={inputClassName(showValidation, errors.supportPhone, fieldValid("supportPhone", (f) => validatePhone(f.supportPhone)))}
                      />
                    </FormField>
                    <FormField
                      label="Support email"
                      htmlFor="support-email"
                      tooltip="Your business email address."
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
                        className={inputClassName(showValidation, errors.supportEmail, fieldValid("supportEmail", (f) => validateEmail(f.supportEmail)))}
                      />
                    </FormField>
                  </div>
                  {!isBasic && (
                    <>
                      <FormField
                        label="Appointment booking link (Calendly, Square, etc.)"
                        htmlFor="booking-url"
                        tooltip="Your Calendly link or similar booking tool. Leave blank if you don't take online bookings yet."
                        showValidation={showValidation}
                        error={errors.bookingUrl}
                        isValid={showValidation && !errors.bookingUrl && (!form.bookingUrl.trim() || validateHttpsUrl(form.bookingUrl) === null)}
                        hint="Customers will be sent here to book. Leave blank if not applicable."
                      >
                        <input
                          id="booking-url"
                          type="url"
                          value={form.bookingUrl}
                          onChange={(e) => update({ bookingUrl: e.target.value })}
                          placeholder="https://calendly.com/yourbusiness"
                          className={inputClassName(showValidation, errors.bookingUrl, showValidation && !errors.bookingUrl && form.bookingUrl.trim() && validateHttpsUrl(form.bookingUrl) === null)}
                        />
                      </FormField>
                      <FormField
                        label="Payment link (optional)"
                        htmlFor="pay-url"
                        tooltip="A link where customers can pay you online. Shows as a 'Pay Now' button in the chat."
                        showValidation={showValidation}
                        error={errors.payNowUrl}
                        isValid={showValidation && !errors.payNowUrl && (!form.payNowUrl.trim() || validateHttpsUrl(form.payNowUrl) === null)}
                        hint="Must start with https:// if provided"
                      >
                        <input
                          id="pay-url"
                          type="url"
                          value={form.payNowUrl}
                          onChange={(e) => update({ payNowUrl: e.target.value })}
                          placeholder="https://yourbusiness.com/pay"
                          className={inputClassName(showValidation, errors.payNowUrl, showValidation && !errors.payNowUrl && form.payNowUrl.trim() && validateHttpsUrl(form.payNowUrl) === null)}
                        />
                      </FormField>
                    </>
                  )}
                </SectionBlock>

                {/* ── Section: Location ── */}
                <SectionBlock
                  title="Location"
                  summary={form.address.city ? [form.address.street, form.address.city, form.address.state].filter(Boolean).join(", ") : "Required"}
                  expanded={expandedSections.location}
                  onToggle={() => setExpandedSections((p) => ({ ...p, location: !p.location }))}
                >
                  <AddressInput
                    address={form.address}
                    onChange={(address) => update({ address })}
                    showValidation={showValidation}
                    errors={errors}
                    tooltip="Your business location. The chatbot will share this when customers ask where you're located."
                  />
                </SectionBlock>

                {/* ── Section: Hours ── */}
                <SectionBlock
                  title="Business Hours"
                  summary="Set your opening hours for each day"
                  expanded={expandedSections.hours}
                  onToggle={() => setExpandedSections((p) => ({ ...p, hours: !p.hours }))}
                >
                  <BusinessHoursEditor
                    hours={form.businessHours}
                    onChange={(businessHours) => update({ businessHours })}
                    tooltip="Set when you're open. The chatbot will tell customers your hours."
                  />
                </SectionBlock>

                {/* ── Section: Industry Details (Pro only) ── */}
                {!isBasic && form.industry && (
                  <SectionBlock
                    title={`${INDUSTRY_LABELS[form.industry] || "Industry"} Details`}
                    summary="Optional — helps the chatbot answer industry-specific questions"
                    expanded={expandedSections.industryDetails}
                    onToggle={() => setExpandedSections((p) => ({ ...p, industryDetails: !p.industryDetails }))}
                  >
                    {form.industry === "restaurant" && (
                      <div className="space-y-4">
                        <FormField label="Menu URL" htmlFor="menu-url" hint="Link to your online menu" showValidation={false} error={null} isValid={false}>
                          <input id="menu-url" type="url" value={form.menuUrl} onChange={(e) => update({ menuUrl: e.target.value })} placeholder="https://yourbusiness.com/menu" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you take reservations?" checked={form.hasReservations} onChange={(v) => update({ hasReservations: v })} />
                        {form.hasReservations && (
                          <FormField label="Reservation link" htmlFor="reservation-link" hint="Link to your reservation system" showValidation={false} error={null} isValid={false}>
                            <input id="reservation-link" type="url" value={form.reservationLink} onChange={(e) => update({ reservationLink: e.target.value })} placeholder="https://opentable.com/yourbusiness" className={inputClassName(false, null, false)} />
                          </FormField>
                        )}
                        <Toggle label="Do you offer delivery or takeout?" checked={form.hasDelivery} onChange={(v) => update({ hasDelivery: v })} />
                        <FormField label="Dietary options" htmlFor="dietary-options" hint="e.g. Vegetarian, Vegan, Gluten-free, Halal" showValidation={false} error={null} isValid={false}>
                          <textarea id="dietary-options" rows={2} value={form.dietaryOptions} onChange={(e) => update({ dietaryOptions: e.target.value })} placeholder="e.g. Vegetarian, Vegan, Gluten-free, Halal" className={inputClassName(false, null, false)} />
                        </FormField>
                        <FormField label="Price range" htmlFor="price-range" hint="e.g. $10-20 per person" showValidation={false} error={null} isValid={false}>
                          <input id="price-range" type="text" value={form.priceRange} onChange={(e) => update({ priceRange: e.target.value })} placeholder="e.g. $10-20 per person" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}
                    {form.industry === "dental" && (
                      <div className="space-y-4">
                        <Toggle label="Are you accepting new patients?" checked={form.acceptingNewPatients} onChange={(v) => update({ acceptingNewPatients: v })} />
                        <InsuranceSelector value={form.insurancePlans} onChange={(insurancePlans) => update({ insurancePlans })} />
                        <Toggle label="Do you offer payment plans?" checked={form.hasPaymentPlans} onChange={(v) => update({ hasPaymentPlans: v })} />
                        {form.acceptingNewPatients && (
                          <FormField label="New patient form URL" htmlFor="new-patient-form" hint="Link to your new patient intake form" showValidation={false} error={null} isValid={false}>
                            <input id="new-patient-form" type="url" value={form.newPatientFormUrl} onChange={(e) => update({ newPatientFormUrl: e.target.value })} placeholder="https://yourbusiness.com/new-patient" className={inputClassName(false, null, false)} />
                          </FormField>
                        )}
                      </div>
                    )}
                    {form.industry === "salon" && (
                      <div className="space-y-4">
                        <Toggle label="Do you accept walk-ins?" checked={form.walkInsWelcome} onChange={(v) => update({ walkInsWelcome: v })} />
                        <FormField label="Services & pricing" htmlFor="services-pricing-salon" hint="List your main services and prices" showValidation={false} error={null} isValid={false}>
                          <textarea id="services-pricing-salon" rows={3} value={form.servicesPricing} onChange={(e) => update({ servicesPricing: e.target.value })} placeholder="e.g. Haircut $35, Color $80+, Blowout $45" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer gift cards?" checked={form.hasGiftCards} onChange={(v) => update({ hasGiftCards: v })} />
                      </div>
                    )}
                    {form.industry === "barber" && (
                      <div className="space-y-4">
                        <Toggle label="Do you accept walk-ins?" checked={form.walkInsWelcome} onChange={(v) => update({ walkInsWelcome: v })} />
                        <FormField label="Services & pricing" htmlFor="services-pricing-barber" hint="List your main services and prices" showValidation={false} error={null} isValid={false}>
                          <textarea id="services-pricing-barber" rows={3} value={form.servicesPricing} onChange={(e) => update({ servicesPricing: e.target.value })} placeholder="e.g. Haircut $30, Fade $35, Beard Trim $15" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer beard trims?" checked={form.hasBeardTrim} onChange={(v) => update({ hasBeardTrim: v })} />
                      </div>
                    )}
                    {form.industry === "gym" && (
                      <div className="space-y-4">
                        <FormField label="Membership page URL" htmlFor="membership-url" hint="Link to your memberships/pricing page" showValidation={false} error={null} isValid={false}>
                          <input id="membership-url" type="url" value={form.membershipUrl} onChange={(e) => update({ membershipUrl: e.target.value })} placeholder="https://yourgym.com/memberships" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer a free trial or guest pass?" checked={form.hasFreeTrial} onChange={(v) => update({ hasFreeTrial: v })} />
                        <Toggle label="Do you offer classes?" checked={form.hasClasses} onChange={(v) => update({ hasClasses: v })} />
                        {form.hasClasses && (
                          <FormField label="Class schedule URL" htmlFor="class-schedule-url" hint="Link to your class schedule" showValidation={false} error={null} isValid={false}>
                            <input id="class-schedule-url" type="url" value={form.classScheduleUrl} onChange={(e) => update({ classScheduleUrl: e.target.value })} placeholder="https://yourgym.com/schedule" className={inputClassName(false, null, false)} />
                          </FormField>
                        )}
                        <Toggle label="Do you have personal trainers?" checked={form.hasTrainers} onChange={(v) => update({ hasTrainers: v })} />
                        <FormField label="Equipment info" htmlFor="equipment-info" hint="Brief description of your main equipment" showValidation={false} error={null} isValid={false}>
                          <textarea id="equipment-info" rows={2} value={form.equipmentInfo} onChange={(e) => update({ equipmentInfo: e.target.value })} placeholder="e.g. Free weights, treadmills, squat racks, cable machines" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}
                    {form.industry === "law" && (
                      <div className="space-y-4">
                        <FormField label="Practice areas" htmlFor="practice-areas" hint="e.g. Personal injury, Family law, Criminal defense" showValidation={false} error={null} isValid={false}>
                          <textarea id="practice-areas" rows={2} value={form.practiceAreas} onChange={(e) => update({ practiceAreas: e.target.value })} placeholder="e.g. Personal injury, Family law, Criminal defense" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer free consultations?" checked={form.freeConsultation} onChange={(v) => update({ freeConsultation: v })} />
                        <FormField label="Fee structure" htmlFor="fees-info" hint="e.g. Contingency fee, hourly rate starting at $X" showValidation={false} error={null} isValid={false}>
                          <input id="fees-info" type="text" value={form.feesInfo} onChange={(e) => update({ feesInfo: e.target.value })} placeholder="e.g. Contingency fee (no win, no fee)" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you work on contingency?" checked={form.worksOnContingency} onChange={(v) => update({ worksOnContingency: v })} />
                        <FormField label="Typical case timeline" htmlFor="case-timeline" hint="e.g. Most cases resolve in 6-12 months" showValidation={false} error={null} isValid={false}>
                          <input id="case-timeline" type="text" value={form.caseTimeline} onChange={(e) => update({ caseTimeline: e.target.value })} placeholder="e.g. Most cases resolve in 6-12 months" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}
                    {form.industry === "lawn" && (
                      <div className="space-y-4">
                        <FormField label="Service area" htmlFor="service-area" hint="e.g. Pittsburgh and suburbs within 20 miles" showValidation={false} error={null} isValid={false}>
                          <textarea id="service-area" rows={2} value={form.serviceArea} onChange={(e) => update({ serviceArea: e.target.value })} placeholder="e.g. Pittsburgh and surrounding suburbs within 20 miles" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Do you offer free estimates?" checked={form.freeEstimates} onChange={(v) => update({ freeEstimates: v })} />
                        <Toggle label="Do you offer recurring service plans?" checked={form.recurringPlans} onChange={(v) => update({ recurringPlans: v })} />
                        <Toggle label="Are you licensed and insured?" checked={form.isLicensed} onChange={(v) => update({ isLicensed: v })} />
                        <FormField label="Services & pricing" htmlFor="services-pricing-lawn" hint="e.g. Lawn mowing from $35, Mulching from $150" showValidation={false} error={null} isValid={false}>
                          <textarea id="services-pricing-lawn" rows={2} value={form.servicesPricing} onChange={(e) => update({ servicesPricing: e.target.value })} placeholder="e.g. Lawn mowing from $35, Mulching from $150" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}
                    {form.industry === "real_estate" && (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-sm font-medium text-[#1A1A2E]">Who do you work with?</p>
                          <div className="flex gap-3">
                            {[{ value: "buyers", label: "Buyers" }, { value: "sellers", label: "Sellers" }, { value: "both", label: "Both" }].map(({ value, label }) => (
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
                        <FormField label="Listings page URL" htmlFor="listings-url" hint="Link to your active listings" showValidation={false} error={null} isValid={false}>
                          <input id="listings-url" type="url" value={form.listingsUrl} onChange={(e) => update({ listingsUrl: e.target.value })} placeholder="https://youragent.com/listings" className={inputClassName(false, null, false)} />
                        </FormField>
                        <Toggle label="Are you accepting new clients?" checked={form.acceptingClients} onChange={(v) => update({ acceptingClients: v })} />
                        <FormField label="Fee/commission info" htmlFor="fees-info-re" hint="e.g. Standard 3% buyer's agent commission" showValidation={false} error={null} isValid={false}>
                          <input id="fees-info-re" type="text" value={form.feesInfo} onChange={(e) => update({ feesInfo: e.target.value })} placeholder="e.g. Standard 3% buyer's agent commission" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}
                    {form.industry === "other" && (
                      <div className="space-y-4">
                        <FormField label="Services & pricing" htmlFor="other-services-pricing" hint="List your main services and prices" showValidation={false} error={null} isValid={false}>
                          <textarea id="other-services-pricing" rows={3} value={form.servicesPricing} onChange={(e) => update({ servicesPricing: e.target.value })} placeholder="e.g. Web design from $500, Logo design $200" className={inputClassName(false, null, false)} />
                        </FormField>
                        <FormField label="Payment methods accepted" htmlFor="payment-info" hint="e.g. Cash, Card, Venmo, Zelle" showValidation={false} error={null} isValid={false}>
                          <textarea id="payment-info" rows={2} value={form.paymentInfo} onChange={(e) => update({ paymentInfo: e.target.value })} placeholder="e.g. Cash, Card, Venmo, Zelle" className={inputClassName(false, null, false)} />
                        </FormField>
                        <FormField label="Additional information" htmlFor="extra-info" hint="Add any extra details your chatbot should know" showValidation={false} error={null} isValid={false}>
                          <textarea id="extra-info" rows={4} value={form.extraInfo} onChange={(e) => update({ extraInfo: e.target.value })} placeholder="Add any extra details your chatbot should know…" className={inputClassName(false, null, false)} />
                        </FormField>
                      </div>
                    )}
                  </SectionBlock>
                )}

                {/* AI preview */}
                {businessInfo && (
                  <div className="rounded-xl border border-[#0D7377]/20 bg-[#E8F4F4] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#0D7377]">AI preview</p>
                    <p className="text-xs leading-relaxed text-[#4A5568]">{businessInfo}</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 is Pro-only — Basic users jump from step 2 directly to step 4 */}
            {step === 3 && (
              <div className="space-y-8">
                {/* Mascot */}
                <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
                  <div className="flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] p-8">
                    {form.industry ? (
                      <MascotCharacter industry={form.industry} animation="bounce" size={120} />
                    ) : (
                      <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#E2E8F0] text-[#4A5568]">?</div>
                    )}
                    <p className="mt-4 text-sm font-medium text-[#0D7377]">
                      {form.industry ? `${INDUSTRY_LABELS[form.industry]} mascot` : "Select an industry in Step 2"}
                    </p>
                  </div>
                  <div className="flex-1 space-y-4">
                    <p className="text-sm text-[#4A5568]">
                      Give your mascot a friendly name. It appears in the chat header and helps your brand feel personal.
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
                        className={inputClassName(showValidation, errors.mascotName, fieldValid("mascotName", (f) => validateMascotName(f.mascotName)))}
                      />
                    </FormField>
                    <p className="rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] p-4 text-xs text-[#4A5568]">
                      Letters and spaces only · 2–20 characters
                    </p>
                  </div>
                </div>

                {/* Branding */}
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
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <QuickRepliesEditor
                  industry={form.industry || "other"}
                  quickReplies={form.quickReplies}
                  onChange={(quickReplies) => update({ quickReplies })}
                  customQA={form.customQA}
                  onCustomQAChange={(customQA) => update({ customQA })}
                  showValidation={showValidation}
                  fieldErrors={errors}
                  formFields={form}
                />
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
