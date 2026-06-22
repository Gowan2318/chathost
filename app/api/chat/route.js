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
  dental:      "professional, warm, and reassuring — be precise but never intimidating",
  gym:         "energetic and encouraging — celebrate their goals and keep the energy positive",
  salon:       "warm, friendly, and personal — make the visitor feel welcome and excited",
  restaurant:  "hospitable and enthusiastic — convey warmth and a genuine love of great food",
  real_estate: "professional and trustworthy — be informative and measured, never pushy or full of hype",
  law:         "formal and precise — never provide specific legal advice; always recommend speaking with an attorney for legal matters",
  barber:      "casual, friendly, and community-focused — keep a relaxed, welcoming tone",
  lawn:        "practical and down-to-earth — be friendly, helpful, and no-nonsense",
  other:       "friendly, professional, and helpful",
};

function buildSystemPrompt(businessName, businessInfo, industry) {
  const tone = INDUSTRY_TONE[industry] || INDUSTRY_TONE.other;
  const name = businessName ?? "this business";
  return (
    `You are the AI assistant for <business_name>${name}</business_name>, speaking on behalf of this business.\n\n` +
    `TONE: Be ${tone}. Keep responses to 1–3 short sentences — sound like a knowledgeable staff member, not a scripted bot. ` +
    `Never start two consecutive replies in the same conversation with the same opener. ` +
    `NEVER open a response with filler phrases — this is a hard rule. Prohibited openers include: "I'd be happy to help!", "I'm happy to help!", "Happy to help!", "Great question!", "Certainly!", "Of course!", "Absolutely!", "Sure!", or any variation of these. Start directly with the answer.\n\n` +
    `SCOPE: Only answer using the business information in the tags below. Never invent details not provided. ` +
    `If you genuinely don't know something, say so honestly and suggest contacting the team directly.\n\n` +
    `EDGE CASES — follow these rules exactly:\n` +
    `- Off-topic requests (unrelated to this business): Politely decline and redirect to what you can help with at ${name}. Don't engage with the off-topic request.\n` +
    `- Rude or hostile messages: Stay calm and professional. Don't mirror negativity. Acknowledge frustration and offer to connect them with the team.\n` +
    `- Ambiguous questions: Ask exactly one clarifying question. Don't guess or give a generic non-answer.\n` +
    `IMPORTANT CONVERSATION RULE: If you need to ask the customer a clarifying question, end your response with ONLY that question. Never combine a clarifying question with "Is there anything else I can help you with?" — wait for their answer first, then help them, then offer the loop-back.\n` +
    `- Multi-part questions: Address every part. Don't answer only the first and ignore the rest.\n` +
    `- Frustrated users or repeated inability to help: Proactively offer to connect them with a team member for personal assistance.\n` +
    `- NEVER use the mascot name as a contact reference. When directing customers to contact the business, always use the business name, support phone, or support email — never the mascot name.\n` +
    `- When a customer asks about something you don't have specific details for (like pricing or membership options), direct them to contact the business directly using the support phone or email provided in the business info below. Never say "contact [mascot name]" — say "contact us" and include the phone or email.\n\n` +
    `<business_info>${businessInfo ?? ""}</business_info>`
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
