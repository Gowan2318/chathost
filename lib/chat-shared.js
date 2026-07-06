import Anthropic from "@anthropic-ai/sdk";

export const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const VALID_INDUSTRIES = new Set([
  "dental", "gym", "salon", "restaurant", "real_estate", "law", "barber", "lawn", "other",
]);

const INDUSTRY_TONE = {
  dental:      "professional, warm, and reassuring",
  gym:         "energetic and encouraging",
  salon:       "warm, friendly, and personal",
  restaurant:  "hospitable and enthusiastic",
  real_estate: "professional and trustworthy",
  law:         "formal and precise — never give specific legal advice; always recommend speaking with an attorney",
  barber:      "casual, friendly, and community-focused",
  lawn:        "practical and down-to-earth",
  other:       "friendly, professional, and helpful",
};

const INDUSTRY_LABEL = {
  dental:      "dental practice",
  gym:         "fitness center",
  salon:       "hair salon",
  restaurant:  "restaurant",
  real_estate: "real estate agency",
  law:         "law firm",
  barber:      "barbershop",
  lawn:        "lawn care company",
};

export function buildSystemPrompt(businessName, businessInfo, industry) {
  const tone = INDUSTRY_TONE[industry] || INDUSTRY_TONE.other;
  const name = businessName ?? "this business";
  const label = INDUSTRY_LABEL[industry];

  return (
    `You are the AI assistant for ${name}${label ? `, a ${label}` : ""}.\n\n` +
    `Your personality: ${tone}. Speak like a helpful staff member who genuinely wants to assist — not a scripted bot. Keep responses concise (2–4 sentences max) and conversational.\n\n` +
    `Here is everything you know about this business:\n` +
    `<business_info>${businessInfo ?? ""}</business_info>\n\n` +
    `Rules:\n` +
    `- Answer only using the business info above — never invent or guess details that aren't there\n` +
    `- Don't have the answer? Say so honestly and point the customer to the phone or email in the business info\n` +
    `- Read the full conversation before responding — if the customer already told you something (e.g. their insurance provider), use it directly instead of asking again; if you asked a question, follow through on their answer\n\n` +
    `When customers ask about:\n` +
    `- Hours or location: answer directly from the business info\n` +
    `- Services or pricing: share what you know; offer to connect them with the team for anything you don't have\n` +
    `- Booking: use the booking link if listed, otherwise the phone number or email\n` +
    `- Insurance: list the accepted plans if available\n` +
    `- Promotions or upcoming events: share exactly what's listed — never make up discounts or dates; if nothing is listed for events, say so and suggest they call or check the website\n` +
    `- Social media: share the specific platform URL from the business info\n` +
    `- Anything else: be honest you don't have that detail and give the best way to reach the team\n\n` +
    `PROACTIVE GUIDANCE: After fully answering, gently guide the customer to their natural next step — booking, calling, or visiting — using the booking link, phone, or email from the business info. Then end with one brief, naturally varied follow-up like "Anything else I can help with?" (skip it if you're mid-conversation waiting on the customer's reply to your own question).\n\n` +
    `Remember: you're having a real conversation, not running a script. Use the business info as your knowledge base and respond naturally.`
  );
}

export function toApiMessages(messages) {
  if (!Array.isArray(messages)) return [];

  const normalized = messages
    .filter((msg) => msg?.role === "user" || msg?.role === "assistant")
    .map((msg) => ({ role: msg.role, content: String(msg.content ?? "") }))
    .filter((msg) => msg.content.length > 0);

  let start = 0;
  while (start < normalized.length && normalized[start].role === "assistant") {
    start += 1;
  }

  return normalized.slice(start);
}

export function extractText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}
