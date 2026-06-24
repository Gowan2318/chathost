import { formatAddressLine } from "./builder-address";
import { formatBusinessHours } from "./builder-hours";

function formatPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/** Builds the AI context string from structured builder fields */
export function composeBusinessInfo(form) {
  const parts = [];

  if (form.businessDescription?.trim()) {
    parts.push(form.businessDescription.trim());
  }

  if (form.servicesDescription?.trim()) {
    parts.push(`Services: ${form.servicesDescription.trim()}`);
  }

  const hours = formatBusinessHours(form.businessHours);
  if (hours) parts.push(`Hours: ${hours}`);

  const address = formatAddressLine(form.address);
  if (address) parts.push(`Address: ${address}`);

  if (form.supportPhone?.trim()) {
    parts.push(`Phone: ${formatPhone(form.supportPhone.trim())}`);
  }
  if (form.supportEmail?.trim()) {
    parts.push(`Email: ${form.supportEmail.trim()}`);
  }

  const industryDetails = composeIndustryInfo(form);
  if (industryDetails) parts.push(industryDetails);

  const qaBlock = formatCustomQAForPrompt(form.customQA);
  if (qaBlock) parts.push(qaBlock);

  return parts.join(". ");
}

function composeIndustryInfo(form) {
  const industry = form.industry;
  const parts = [];

  if (industry === "restaurant") {
    if (form.menuUrl?.trim()) parts.push(`Online menu: ${form.menuUrl.trim()}`);
    parts.push(form.hasReservations ? "Reservations accepted" : "We do not take reservations");
    if (form.hasReservations && form.reservationLink?.trim()) parts.push(`Make a reservation: ${form.reservationLink.trim()}`);
    parts.push(form.hasDelivery ? "Delivery and takeout available" : "Dine-in only — no delivery or takeout");
    if (form.dietaryOptions?.trim()) parts.push(`Dietary options: ${form.dietaryOptions.trim()}`);
    if (form.priceRange?.trim()) parts.push(`Price range: ${form.priceRange.trim()}`);
  } else if (industry === "dental") {
    parts.push(form.acceptingNewPatients ? "Currently accepting new patients" : "Not currently accepting new patients — please call to check availability");
    const plans = Array.isArray(form.insurancePlans) ? form.insurancePlans.filter(Boolean) : [];
    if (plans.length > 0) {
      if (plans.includes("No insurance accepted") || plans.includes("Private pay only")) {
        parts.push("We do not accept insurance — we are a private pay practice");
      } else if (plans.includes("We accept most major plans")) {
        parts.push("We accept most major insurance plans");
      } else {
        parts.push(`Insurance accepted: ${plans.join(", ")}`);
      }
    }
    parts.push(form.hasPaymentPlans ? "Payment plans available" : "No payment plans — full payment due at time of service");
    if (form.acceptingNewPatients && form.newPatientFormUrl?.trim()) parts.push(`New patient form: ${form.newPatientFormUrl.trim()}`);
  } else if (industry === "salon") {
    parts.push(form.walkInsWelcome ? "Walk-ins welcome" : "By appointment only — walk-ins not accepted");
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
    parts.push(form.hasGiftCards ? "Gift cards available" : "Gift cards not offered");
  } else if (industry === "barber") {
    parts.push(form.walkInsWelcome ? "Walk-ins welcome" : "By appointment only — walk-ins not accepted");
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
    parts.push(form.hasBeardTrim ? "Beard trims available" : "Haircuts only — no beard trims");
  } else if (industry === "gym") {
    if (form.membershipUrl?.trim()) parts.push(`For membership options and pricing, visit: ${form.membershipUrl.trim()}`);
    parts.push(form.hasFreeTrial ? "Free trial or guest pass available" : "No free trial — membership required to use the gym");
    parts.push(form.hasClasses ? "Group fitness classes offered" : "No group classes — open gym only");
    if (form.hasClasses && form.classScheduleUrl?.trim()) parts.push(`Class schedule: ${form.classScheduleUrl.trim()}`);
    parts.push(form.hasTrainers ? "Personal trainers available on staff" : "No personal trainers on staff");
    if (form.equipmentInfo?.trim()) parts.push(`Equipment: ${form.equipmentInfo.trim()}`);
  } else if (industry === "law") {
    if (form.practiceAreas?.trim()) parts.push(`Practice areas: ${form.practiceAreas.trim()}`);
    parts.push(form.freeConsultation ? "Free initial consultation available" : "Consultations are not free — fees apply");
    if (form.feesInfo?.trim()) parts.push(`Fee structure: ${form.feesInfo.trim()}`);
    parts.push(form.worksOnContingency ? "Works on contingency" : "Does not work on contingency — upfront fees required");
    if (form.caseTimeline?.trim()) parts.push(`Typical case timeline: ${form.caseTimeline.trim()}`);
  } else if (industry === "lawn") {
    if (form.serviceArea?.trim()) parts.push(`Service area: ${form.serviceArea.trim()}`);
    parts.push(form.freeEstimates ? "Free estimates available" : "Estimates may be subject to a fee — contact us to confirm");
    parts.push(form.recurringPlans ? "Recurring service plans available" : "One-time services only — no recurring plans");
    parts.push(form.isLicensed ? "Licensed and fully insured" : "Not licensed or insured");
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
  } else if (industry === "real_estate") {
    const clientTypeLabel = { buyers: "buyers", sellers: "sellers", both: "buyers and sellers" }[form.clientType];
    if (clientTypeLabel) parts.push(`Works with: ${clientTypeLabel}`);
    if (form.areasServed?.trim()) parts.push(`Areas served: ${form.areasServed.trim()}`);
    if (form.listingsUrl?.trim()) parts.push(`View active listings: ${form.listingsUrl.trim()}`);
    parts.push(form.acceptingClients ? "Currently accepting new clients" : "Not currently accepting new clients");
    if (form.feesInfo?.trim()) parts.push(`Fees: ${form.feesInfo.trim()}`);
  } else if (industry === "other") {
    if (form.extraInfo?.trim()) parts.push(form.extraInfo.trim());
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
    if (form.paymentInfo?.trim()) parts.push(`Payment methods accepted: ${form.paymentInfo.trim()}`);
  }

  return parts.join(". ");
}

/** Injected into AI context so the bot answers custom Q&A accurately */
export function formatCustomQAForPrompt(customQA) {
  if (!Array.isArray(customQA) || customQA.length === 0) return "";

  const pairs = customQA
    .filter((item) => item?.question?.trim() && item?.answer?.trim())
    .map(
      (item) =>
        `Q: ${item.question.trim()}\nA: ${item.answer.trim()}`
    );

  if (pairs.length === 0) return "";

  return `Custom Q&A — when customers ask similar questions, answer exactly as written:\n${pairs.join("\n\n")}`;
}

export const MAX_KNOWLEDGE_SLOTS = 8;

export function countKnowledgeSlots(quickReplies, customQA) {
  const replies = Array.isArray(quickReplies) ? quickReplies.filter(Boolean).length : 0;
  const qa = Array.isArray(customQA) ? customQA.length : 0;
  return replies + qa;
}
