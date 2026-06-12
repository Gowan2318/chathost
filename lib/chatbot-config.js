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
  };
}

export function buildEmbedCode(clientId) {
  return `<script src="https://vestachathost.com/widget.js?id=${clientId}"></script>`;
}
