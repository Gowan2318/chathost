import { DEFAULT_QUICK_REPLIES } from "./industries";

export const INDUSTRY_QUICK_REPLY_SUGGESTIONS = {
  dental: [
    "What are your hours?",
    "How do I book an appointment?",
    "Do you accept my insurance?",
    "What services do you offer?",
    "Are you accepting new patients?",
    "Where are you located?",
    "How do I pay?",
    "Talk to someone",
  ],
  gym: [
    "What are your hours?",
    "How do I start a membership?",
    "What are your membership prices?",
    "Do you offer personal training?",
    "Can I book a tour?",
    "Where are you located?",
    "What classes do you offer?",
    "Talk to someone",
  ],
  salon: [
    "What are your hours?",
    "How do I book an appointment?",
    "What services do you offer?",
    "What are your prices?",
    "Do you walk in?",
    "Where are you located?",
    "How do I pay?",
    "Talk to someone",
  ],
  restaurant: [
    "What are your hours?",
    "Can I make a reservation?",
    "Do you offer takeout?",
    "What's on the menu?",
    "Do you cater events?",
    "Where are you located?",
    "How do I pay?",
    "Talk to someone",
  ],
  real_estate: [
    "What are your hours?",
    "I'd like to schedule a showing",
    "What listings do you have?",
    "How do I list my home?",
    "What areas do you serve?",
    "Where is your office?",
    "How do I contact an agent?",
    "Talk to someone",
  ],
  law: [
    "What are your hours?",
    "How do I schedule a consultation?",
    "What practice areas do you cover?",
    "What are your fees?",
    "Do you offer free consultations?",
    "Where is your office?",
    "How do I pay?",
    "Talk to someone",
  ],
  barber: [
    "What are your hours?",
    "How do I book a haircut?",
    "What services do you offer?",
    "What are your prices?",
    "Do you take walk-ins?",
    "Where are you located?",
    "How do I pay?",
    "Talk to someone",
  ],
  other: [...DEFAULT_QUICK_REPLIES],
};

export function getIndustryQuickReplySuggestions(industry) {
  return INDUSTRY_QUICK_REPLY_SUGGESTIONS[industry] ?? DEFAULT_QUICK_REPLIES;
}
