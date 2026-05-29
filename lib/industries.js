export const INDUSTRIES = [
  { id: "dental", label: "Dental" },
  { id: "gym", label: "Gym & Fitness" },
  { id: "salon", label: "Salon & Spa" },
  { id: "restaurant", label: "Restaurant" },
  { id: "real_estate", label: "Real Estate" },
  { id: "law", label: "Law Firm" },
  { id: "barber", label: "Barber Shop" },
  { id: "other", label: "Other" },
];

/** Lawn care mascot used for marketing demo (GreenLeaf). */
export const DEMO_INDUSTRY = "lawn";

export const INDUSTRY_LABELS = {
  dental: "Dental",
  gym: "Gym & Fitness",
  salon: "Salon & Spa",
  restaurant: "Restaurant",
  real_estate: "Real Estate",
  law: "Law Firm",
  barber: "Barber Shop",
  lawn: "Lawn Care",
  other: "Other",
};

export const DEFAULT_QUICK_REPLIES = [
  "What are your hours?",
  "How do I book an appointment?",
  "What services do you offer?",
  "What are your prices?",
  "Do you accept insurance?",
  "Where are you located?",
  "How do I pay?",
  "Talk to someone",
];

export const GREENLEAF_DEMO_CONFIG = {
  businessName: "GreenLeaf Lawn Care",
  businessInfo:
    "GreenLeaf is an eco-friendly lawn care company offering mowing, landscaping, and seasonal cleanups. Hours: Mon–Fri 8am–6pm, Sat 9am–2pm. Phone: (555) 123-4567. Email: hello@greenleaf.example.",
  supportPhone: "(555) 123-4567",
  supportEmail: "hello@greenleaf.example",
  payNowUrl: "https://example.com/pay",
  brandColor: "#059669",
  industry: "lawn",
  mascotName: "Leafy",
  quickReplies: DEFAULT_QUICK_REPLIES,
  pricingInfo: `Here's how our pricing works:

• Basic lawn care — $45 per visit
• Full landscaping — from $150
• Seasonal cleanup — from $89

You can pay securely online after your service is scheduled.`,
};
