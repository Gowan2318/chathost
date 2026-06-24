/** Builds the JSON config stored in Supabase and returned by the widget API */
export function buildChatbotConfig(form, businessInfo) {
  return {
    businessName: form.businessName,
    businessInfo: businessInfo || "",
    businessDescription: form.businessDescription,
    servicesDescription: form.servicesDescription,
    businessHours: form.businessHours,
    address: form.address,
    supportPhone: form.supportPhone,
    supportEmail: form.supportEmail,
    booking_url: form.bookingUrl || "",
    payNowUrl: form.payNowUrl,
    brandColor: form.brandColor,
    chatTheme: form.chatTheme || "light",
    quickReplies: Array.isArray(form.quickReplies)
      ? form.quickReplies.filter(Boolean).slice(0, 8)
      : [],
    customQA: Array.isArray(form.customQA) ? form.customQA : [],
    industry: form.industry || "other",
    mascotName: form.mascotName,
    websiteUrl: form.websiteUrl,
    // Restaurant
    menuUrl: form.menuUrl || "",
    hasReservations: Boolean(form.hasReservations),
    reservationLink: form.reservationLink || "",
    hasDelivery: Boolean(form.hasDelivery),
    dietaryOptions: form.dietaryOptions || "",
    priceRange: form.priceRange || "",
    // Dental
    acceptingNewPatients: Boolean(form.acceptingNewPatients),
    insurancePlans: Array.isArray(form.insurancePlans) ? form.insurancePlans : [],
    hasPaymentPlans: Boolean(form.hasPaymentPlans),
    newPatientFormUrl: form.newPatientFormUrl || "",
    // Salon / Barber / Lawncare / Other (shared)
    walkInsWelcome: Boolean(form.walkInsWelcome),
    servicesPricing: form.servicesPricing || "",
    // Salon
    hasGiftCards: Boolean(form.hasGiftCards),
    // Barber
    hasBeardTrim: Boolean(form.hasBeardTrim),
    // Gym
    membershipUrl: form.membershipUrl || "",
    hasFreeTrial: Boolean(form.hasFreeTrial),
    hasClasses: Boolean(form.hasClasses),
    classScheduleUrl: form.classScheduleUrl || "",
    hasTrainers: Boolean(form.hasTrainers),
    equipmentInfo: form.equipmentInfo || "",
    // Law + Real estate (shared)
    feesInfo: form.feesInfo || "",
    // Law
    practiceAreas: form.practiceAreas || "",
    freeConsultation: Boolean(form.freeConsultation),
    worksOnContingency: Boolean(form.worksOnContingency),
    caseTimeline: form.caseTimeline || "",
    // Lawncare
    serviceArea: form.serviceArea || "",
    freeEstimates: Boolean(form.freeEstimates),
    recurringPlans: Boolean(form.recurringPlans),
    isLicensed: Boolean(form.isLicensed),
    // Real estate
    clientType: form.clientType || "both",
    areasServed: form.areasServed || "",
    listingsUrl: form.listingsUrl || "",
    acceptingClients: Boolean(form.acceptingClients),
    // Other
    extraInfo: form.extraInfo || "",
    paymentInfo: form.paymentInfo || "",
  };
}

export function buildEmbedCode(clientId) {
  return `<script src="https://vestachathost.com/widget.js?id=${clientId}"></script>`;
}
