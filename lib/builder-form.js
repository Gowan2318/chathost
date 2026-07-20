import { formatAddressLine } from "./builder-address.js";
import { formatBusinessHours } from "./builder-hours.js";

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

  const hours = formatBusinessHours(form.businessHours) || form.businessHoursRaw?.trim();
  if (hours) parts.push(`Hours: ${hours}`);

  const address = formatAddressLine(form.address);
  if (address) parts.push(`Address: ${address}`);

  if (form.supportPhone?.trim()) {
    parts.push(`Phone: ${formatPhone(form.supportPhone.trim())}`);
  }
  if (form.supportEmail?.trim()) {
    parts.push(`Email: ${form.supportEmail.trim()}`);
  }

  const bookingUrl = (form.bookingUrl || form.booking_url || "").trim();
  if (bookingUrl) {
    parts.push(`To book an appointment online: ${bookingUrl}`);
  }

  const industryDetails = composeIndustryInfo(form);
  if (industryDetails) parts.push(industryDetails);

  const qaBlock = formatCustomQAForPrompt(form.customQA);
  if (qaBlock) parts.push(qaBlock);

  if (form.websiteKnowledge?.trim()) {
    parts.push(`Additional business knowledge:\n${form.websiteKnowledge.trim()}`);
  }
  if (form.promotions?.trim()) {
    parts.push(`Current promotions/specials: ${form.promotions.trim()}`);
  }
  if (form.upcomingEvents?.trim()) {
    parts.push(`Upcoming events: ${form.upcomingEvents.trim()}`);
  }
  const sl = form.socialLinks;
  if (sl && typeof sl === "object") {
    const socialParts = [];
    if (sl.instagram) socialParts.push(`Instagram: ${sl.instagram}`);
    if (sl.facebook) socialParts.push(`Facebook: ${sl.facebook}`);
    if (sl.tiktok) socialParts.push(`TikTok: ${sl.tiktok}`);
    if (Array.isArray(sl.other)) socialParts.push(...sl.other);
    if (socialParts.length > 0) parts.push(`Social media: ${socialParts.join(", ")}`);
  }

  return parts.join(". ");
}

// All toggle fields use null | true | false. Only emit affirmative or negative text
// when the owner has explicitly confirmed a value. null = unconfirmed → emit nothing.
function composeIndustryInfo(form) {
  const industry = form.industry;
  const parts = [];

  if (industry === "restaurant") {
    if (form.menuUrl?.trim()) parts.push(`Online menu: ${form.menuUrl.trim()}`);
    if (form.hasReservations === true) {
      parts.push("Reservations accepted");
      if (form.reservationLink?.trim()) parts.push(`Make a reservation: ${form.reservationLink.trim()}`);
    } else if (form.hasReservations === false) {
      parts.push("We do not take reservations");
    }
    if (form.hasDelivery === true) parts.push("Delivery and takeout available");
    else if (form.hasDelivery === false) parts.push("Dine-in only — no delivery or takeout");
    if (form.dietaryOptions?.trim()) parts.push(`Dietary options: ${form.dietaryOptions.trim()}`);
    if (form.priceRange?.trim()) parts.push(`Price range: ${form.priceRange.trim()}`);
  } else if (industry === "dental") {
    if (form.acceptingNewPatients === true) parts.push("We are currently accepting new patients");
    else if (form.acceptingNewPatients === false) parts.push("We are not currently accepting new patients — our schedule is full at this time");
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
    if (form.hasPaymentPlans === true) parts.push("Payment plans available");
    else if (form.hasPaymentPlans === false) parts.push("No payment plans — full payment due at time of service");
    if (form.acceptingNewPatients === true && form.newPatientFormUrl?.trim()) parts.push(`New patient form: ${form.newPatientFormUrl.trim()}`);
  } else if (industry === "salon") {
    if (form.walkInsWelcome === true) parts.push("Walk-ins welcome");
    else if (form.walkInsWelcome === false) parts.push("By appointment only — walk-ins not accepted");
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
    if (form.hasGiftCards === true) parts.push("Gift cards available");
    else if (form.hasGiftCards === false) parts.push("Gift cards not offered");
  } else if (industry === "barber") {
    if (form.walkInsWelcome === true) parts.push("Walk-ins welcome");
    else if (form.walkInsWelcome === false) parts.push("By appointment only — walk-ins not accepted");
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
    if (form.hasBeardTrim === true) parts.push("Beard trims available");
    else if (form.hasBeardTrim === false) parts.push("Haircuts only — no beard trims");
  } else if (industry === "gym") {
    if (form.membershipUrl?.trim()) parts.push(`For membership options and pricing, visit: ${form.membershipUrl.trim()}`);
    if (form.hasFreeTrial === true) parts.push("Free trial or guest pass available");
    else if (form.hasFreeTrial === false) parts.push("No free trial — membership required to use the gym");
    if (form.hasClasses === true) {
      parts.push("Group fitness classes offered");
      if (form.classScheduleUrl?.trim()) parts.push(`Class schedule: ${form.classScheduleUrl.trim()}`);
    } else if (form.hasClasses === false) {
      parts.push("No group classes — open gym only");
    }
    if (form.hasTrainers === true) parts.push("Personal trainers available on staff");
    else if (form.hasTrainers === false) parts.push("No personal trainers on staff");
    if (form.equipmentInfo?.trim()) parts.push(`Equipment: ${form.equipmentInfo.trim()}`);
  } else if (industry === "law") {
    if (form.practiceAreas?.trim()) parts.push(`Practice areas: ${form.practiceAreas.trim()}`);
    if (form.freeConsultation === true) parts.push("Free initial consultation available");
    else if (form.freeConsultation === false) parts.push("Consultations are not free — fees apply");
    if (form.feesInfo?.trim()) parts.push(`Fee structure: ${form.feesInfo.trim()}`);
    if (form.worksOnContingency === true) parts.push("Works on contingency");
    else if (form.worksOnContingency === false) parts.push("Does not work on contingency — upfront fees required");
    if (form.caseTimeline?.trim()) parts.push(`Typical case timeline: ${form.caseTimeline.trim()}`);
  } else if (industry === "lawn") {
    if (form.serviceArea?.trim()) parts.push(`Service area: ${form.serviceArea.trim()}`);
    if (form.freeEstimates === true) parts.push("Free estimates available");
    else if (form.freeEstimates === false) parts.push("Estimates may be subject to a fee — contact us to confirm");
    if (form.recurringPlans === true) parts.push("Recurring service plans available");
    else if (form.recurringPlans === false) parts.push("One-time services only — no recurring plans");
    if (form.isLicensed === true) parts.push("Licensed and fully insured");
    else if (form.isLicensed === false) parts.push("Not licensed or insured");
    if (form.servicesPricing?.trim()) parts.push(`Services & pricing: ${form.servicesPricing.trim()}`);
  } else if (industry === "real_estate") {
    const clientTypeLabel = { buyers: "buyers", sellers: "sellers", both: "buyers and sellers" }[form.clientType];
    if (clientTypeLabel) parts.push(`Works with: ${clientTypeLabel}`);
    if (form.areasServed?.trim()) parts.push(`Areas served: ${form.areasServed.trim()}`);
    if (form.listingsUrl?.trim()) parts.push(`View active listings: ${form.listingsUrl.trim()}`);
    if (form.acceptingClients === true) parts.push("Currently accepting new clients");
    else if (form.acceptingClients === false) parts.push("Not currently accepting new clients");
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
