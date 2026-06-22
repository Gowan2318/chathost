import { formatAddressLine } from "./builder-address";
import { formatBusinessHours } from "./builder-hours";

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
    parts.push(`Phone: ${form.supportPhone.trim()}`);
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
    if (form.reservationLink?.trim()) parts.push(`Reservations: ${form.reservationLink.trim()}`);
    if (form.hasDelivery) parts.push("Offers delivery and takeout");
    if (form.dietaryOptions?.trim()) parts.push(`Dietary options: ${form.dietaryOptions.trim()}`);
  } else if (industry === "dental") {
    if (form.insurancePlans?.trim()) parts.push(`Insurance accepted: ${form.insurancePlans.trim()}`);
    if (form.newPatientFormUrl?.trim()) parts.push(`New patient form: ${form.newPatientFormUrl.trim()}`);
    if (form.hasPaymentPlans) parts.push("Payment plans available");
  } else if (industry === "salon" || industry === "barber") {
    parts.push(form.walkInsWelcome ? "Walk-ins welcome" : "Appointments required — walk-ins not accepted");
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
  } else if (industry === "gym") {
    if (form.membershipUrl?.trim()) parts.push(`For membership options and pricing, visit: ${form.membershipUrl.trim()}`);
    if (form.hasFreeTrial) parts.push("Free trial or guest pass available");
    if (form.classScheduleUrl?.trim()) parts.push(`Class schedule: ${form.classScheduleUrl.trim()}`);
  } else if (industry === "law") {
    if (form.practiceAreas?.trim()) parts.push(`Practice areas: ${form.practiceAreas.trim()}`);
    if (form.freeConsultation) parts.push("Free consultations available");
    if (form.worksOnContingency) parts.push("Works on contingency");
  } else if (industry === "lawn") {
    if (form.serviceArea?.trim()) parts.push(`Service area: ${form.serviceArea.trim()}`);
    if (form.freeEstimates) parts.push("Free estimates available");
    if (form.recurringPlans) parts.push("Recurring service plans available");
  } else if (industry === "real_estate") {
    const clientTypeLabel = { buyers: "buyers", sellers: "sellers", both: "buyers and sellers" }[form.clientType];
    if (clientTypeLabel) parts.push(`Works with: ${clientTypeLabel}`);
    if (form.areasServed?.trim()) parts.push(`Areas served: ${form.areasServed.trim()}`);
  } else if (industry === "other") {
    if (form.extraInfo?.trim()) parts.push(form.extraInfo.trim());
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
