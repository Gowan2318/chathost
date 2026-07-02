const filled = (v) => typeof v === "string" && v.trim().length > 0;

export function getFilteredSuggestions(industry, form = {}) {
  switch (industry) {
    case "restaurant":
      return [
        ...(filled(form.menuUrl) ? ["What's on your menu?"] : []),
        "Do you take reservations?",
        "Do you offer delivery?",
        "What are your hours?",
        "Where are you located?",
        ...(filled(form.dietaryOptions) ? ["What dietary options do you have?"] : []),
        ...(filled(form.priceRange) ? ["What's your price range?"] : []),
        "Talk to someone",
      ];
    case "dental":
      return [
        "Are you accepting new patients?",
        ...(filled(form.insurancePlans) ? ["What insurance do you accept?"] : []),
        "How do I book an appointment?",
        "What services do you offer?",
        "What are your hours?",
        "Do you offer payment plans?",
        "Where are you located?",
        "Talk to someone",
      ];
    case "salon":
      return [
        "How do I book an appointment?",
        "What services do you offer?",
        ...(filled(form.servicesPricing) ? ["What are your prices?"] : []),
        "Do you accept walk-ins?",
        "What are your hours?",
        "Where are you located?",
        "Do you offer gift cards?",
        "Talk to someone",
      ];
    case "barber":
      return [
        "How do I book an appointment?",
        ...(filled(form.servicesPricing) ? ["What are your prices?"] : []),
        "Do you accept walk-ins?",
        "What services do you offer?",
        "What are your hours?",
        "Where are you located?",
        "Do you offer beard trims?",
        "Talk to someone",
      ];
    case "gym":
      return [
        "What are your membership options?",
        "How much does a membership cost?",
        "Do you offer a free trial?",
        ...(form.hasClasses === true ? ["What classes do you offer?"] : []),
        "Do you have personal trainers?",
        "What are your hours?",
        "Where are you located?",
        ...(filled(form.equipmentInfo) ? ["What equipment do you have?"] : []),
        "Talk to someone",
      ];
    case "lawn":
      return [
        "What services do you offer?",
        "Do you offer free estimates?",
        ...(filled(form.serviceArea) ? ["What areas do you service?"] : []),
        ...(filled(form.servicesPricing) ? ["How much do your services cost?"] : []),
        "Do you offer recurring plans?",
        "Are you licensed and insured?",
        "How do I book a service?",
        "Talk to someone",
      ];
    case "real_estate":
      return [
        "I'm looking to buy a home — where do I start?",
        "Can you help me sell my home?",
        "What areas do you serve?",
        "How do I get a free home valuation?",
        "Do you help with financing?",
        ...(filled(form.listingsUrl) ? ["View current listings"] : []),
        "How do I get in touch with an agent?",
        "Talk to someone",
      ];
    case "law":
      return [
        "What type of injury or accident are you dealing with?",
        "Do you offer free consultations?",
        "How do I schedule a consultation?",
        "Do you work on contingency?",
        "What types of cases do you handle?",
        "Where are you located?",
        "Talk to someone",
      ];
    default: // "other"
      return [
        "What are your hours?",
        "What services do you offer?",
        "How do I book an appointment?",
        ...(filled(form.servicesPricing) ? ["What are your prices?"] : []),
        "Where are you located?",
        ...(filled(form.paymentInfo) ? ["How do I pay?"] : []),
        "Talk to someone",
      ];
  }
}
