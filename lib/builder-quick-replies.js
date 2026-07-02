export function getFilteredSuggestions(industry, form = {}) {
  switch (industry) {
    case "restaurant":
      return [
        "What's on your menu?",
        "What are your hours?",
        "Where are you located?",
        "Do you take reservations?",
        "Do you offer delivery or takeout?",
        "Do you cater events?",
        "What's your price range?",
        "Talk to someone",
      ];
    case "dental":
      return [
        "Are you accepting new patients?",
        "What services do you offer?",
        "What insurance do you accept?",
        "How do I book an appointment?",
        "What are your hours?",
        "Do you offer payment plans?",
        "Where are you located?",
        "Talk to someone",
      ];
    case "salon":
      return [
        "What services do you offer?",
        "How much do your services cost?",
        "How do I book an appointment?",
        "Do you accept walk-ins?",
        "What are your hours?",
        "Where are you located?",
        "Do you offer gift cards?",
        "Talk to someone",
      ];
    case "barber":
      return [
        "What services do you offer?",
        "How much does a haircut cost?",
        "Do you accept walk-ins?",
        "How do I book an appointment?",
        "Do you offer beard trims?",
        "What are your hours?",
        "Where are you located?",
        "Talk to someone",
      ];
    case "gym":
      return [
        "What are your membership options?",
        "How much does a membership cost?",
        "Do you offer a free trial or guest pass?",
        "What classes do you offer?",
        "Do you have personal trainers?",
        "What are your hours?",
        "Where are you located?",
        "Talk to someone",
      ];
    case "lawn":
      return [
        "What services do you offer?",
        "Do you offer free estimates?",
        "What areas do you service?",
        "How much do your services cost?",
        "Do you offer recurring maintenance plans?",
        "Are you licensed and insured?",
        "How do I get a quote?",
        "Talk to someone",
      ];
    case "real_estate":
      return [
        "I'm looking to buy a home — where do I start?",
        "Can you help me sell my home?",
        "How do I get a free home valuation?",
        "What areas do you serve?",
        "Do you help with financing or pre-approval?",
        "How do I get in touch with an agent?",
        "Are you accepting new clients?",
        "Talk to someone",
      ];
    case "law":
      return [
        "What type of injury or accident are you dealing with?",
        "What types of cases do you handle?",
        "Do you offer free consultations?",
        "How do I schedule a consultation?",
        "Do you work on contingency?",
        "How long does a case typically take?",
        "Where are you located?",
        "Talk to someone",
      ];
    default: // "other"
      return [
        "What services do you offer?",
        "How much do your services cost?",
        "How do I book an appointment?",
        "What are your hours?",
        "Where are you located?",
        "Do you offer free estimates?",
        "How do I get in touch?",
        "Talk to someone",
      ];
  }
}
