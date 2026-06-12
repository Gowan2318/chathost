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

export const GREENLEAF_QUICK_REPLIES = [
  "What are your hours?",
  "How do I book an appointment?",
  "What services do you offer?",
  "Do you offer free estimates?",
  "What areas do you service?",
  "How much does mowing cost?",
  "Do you offer recurring service plans?",
  "Talk to someone",
];

export const GREENLEAF_DEMO_CONFIG = {
  businessName: "GreenLeaf Lawn Care",
  businessInfo:
    "GreenLeaf is an eco-friendly lawn care company serving Pittsburgh and surrounding communities within 25 miles, including the North Hills, South Hills, and Allegheny County. Services: weekly and bi-weekly mowing, edging, trimming, mulching, landscaping, and spring/fall seasonal cleanups. We offer free on-site estimates for new customers. Recurring service plans are available with discounted rates for weekly or bi-weekly mowing. Hours: Mon–Fri 8am–6pm, Sat 9am–2pm. Phone: (555) 123-4567. Email: hello@greenleaf.example.",
  supportPhone: "(555) 123-4567",
  supportEmail: "hello@greenleaf.example",
  payNowUrl: "https://example.com/pay",
  booking_url: "https://calendly.com/demo",
  brandColor: "#059669",
  industry: "lawn",
  mascotName: "Leafy",
  quickReplies: GREENLEAF_QUICK_REPLIES,
  pricingInfo: `Here's how our lawn care pricing works:

• Basic mowing — $45 per visit
• Weekly mowing plan — $40 per visit (recurring)
• Bi-weekly mowing plan — $42 per visit (recurring)
• Full landscaping — from $150
• Seasonal cleanup — from $89

Free estimates available for new customers. You can pay securely online after your service is scheduled.`,
};
