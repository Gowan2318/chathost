import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsJson(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init.headers },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_INDUSTRIES = new Set([
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

function buildSystemPrompt(businessName, businessInfo, industry) {
  const tone = INDUSTRY_TONE[industry] || INDUSTRY_TONE.other;
  const name = businessName ?? "this business";
  const label = INDUSTRY_LABEL[industry];

  return (
    `You are the AI assistant for ${name}${label ? `, a ${label}` : ""}.\n\n` +
    `Your personality: ${tone}. Speak like a helpful staff member who genuinely wants to assist — not a scripted bot. Keep responses concise (2–4 sentences max) and conversational.\n\n` +
    `Here is everything you know about this business:\n` +
    `<business_info>${businessInfo ?? ""}</business_info>\n\n` +
    `Your job:\n` +
    `- Answer questions accurately using only the business information above\n` +
    `- If you know the answer — give it directly and confidently\n` +
    `- If you don't have specific information — be honest and direct the customer to the phone or email in the business info\n` +
    `- Keep conversations flowing naturally — if you ask a question, always follow through with a helpful answer based on what the customer says\n` +
    `- Never make up information not found in the business info above\n` +
    `- At the end of any resolved conversation, make it easy for the customer to take action: book, call, or visit\n\n` +
    `When customers ask about:\n` +
    `- Hours or location: answer directly from the business info above\n` +
    `- Services or pricing: share what you know; offer to connect them with the team for anything you don't have\n` +
    `- Booking: use the booking link in the business info if one is listed, otherwise provide the phone number or email\n` +
    `- Insurance: list the accepted plans if available and help them understand their options\n` +
    `- Anything outside your knowledge: be honest — say you don't have that detail and give them the best way to reach the team\n\n` +
    `Remember: you're having a real conversation, not running a script. Use the business info as your knowledge base and respond naturally.`
  );
}

function toApiMessages(messages) {
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

function extractText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    if (await isIpBlocked(clientIp)) {
      return corsJson({ error: "Access denied" }, { status: 403 });
    }

    const { allowed } = await checkRateLimit(clientIp, "/api/chat", 15, 60);
    if (!allowed) {
      await autoBlockIfAbusive(clientIp);
      return corsJson(
        { error: "Too many requests, please try again in a minute" },
        { status: 429 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return corsJson({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { messages, businessInfo, businessName, industry } = body;

    if (!Array.isArray(messages) || messages.length > 50) {
      return corsJson({ error: "Invalid messages array" }, { status: 400 });
    }
    for (const msg of messages) {
      if (msg?.content != null && String(msg.content).length > 2000) {
        return corsJson({ error: "Message content too long (max 2000 characters)" }, { status: 400 });
      }
    }

    const apiMessages = toApiMessages(messages);

    if (apiMessages.length === 0) {
      return corsJson({ error: "No messages provided" }, { status: 400 });
    }

    const safeIndustry = VALID_INDUSTRIES.has(industry) ? industry : "other";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: buildSystemPrompt(businessName, businessInfo, safeIndustry),
      messages: apiMessages,
    });

    const message = extractText(response.content);

    if (!message) {
      return corsJson({ error: "No response from the model" }, { status: 500 });
    }

    return corsJson({ message });
  } catch (error) {
    console.error("[api/chat] error:", error);
    return corsJson({ error: "Unable to process your request. Please try again." }, { status: 500 });
  }
}
