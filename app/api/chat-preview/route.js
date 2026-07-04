import { NextResponse } from "next/server";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";
import {
  anthropicClient,
  VALID_INDUSTRIES,
  buildSystemPrompt,
  toApiMessages,
  extractText,
} from "../../../lib/chat-shared";

// Same-origin only preview endpoint — used by the builder's live chat preview
// (before a chatbot is saved/paid for) and the landing page demo, neither of
// which has a real, persisted `chatbots` row to look up. /api/chat is the
// production path and never trusts client-supplied business info; this route
// intentionally does, but is not reachable from the public embed script and
// is bounded by tighter rate limits and input size caps.
const MAX_BUSINESS_NAME_LENGTH = 200;
const MAX_BUSINESS_INFO_LENGTH = 6000;

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    if (await isIpBlocked(clientIp)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { allowed } = await checkRateLimit(clientIp, "/api/chat-preview", 10, 60);
    if (!allowed) {
      await autoBlockIfAbusive(clientIp);
      return NextResponse.json(
        { error: "Too many requests, please try again in a minute" },
        { status: 429 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { messages, businessName, businessInfo, industry } = body;

    if (!Array.isArray(messages) || messages.length > 50) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }
    for (const msg of messages) {
      if (msg?.content != null && String(msg.content).length > 2000) {
        return NextResponse.json({ error: "Message content too long (max 2000 characters)" }, { status: 400 });
      }
    }
    if (businessName != null && String(businessName).length > MAX_BUSINESS_NAME_LENGTH) {
      return NextResponse.json({ error: "businessName too long" }, { status: 400 });
    }
    if (businessInfo != null && String(businessInfo).length > MAX_BUSINESS_INFO_LENGTH) {
      return NextResponse.json({ error: "businessInfo too long" }, { status: 400 });
    }

    const apiMessages = toApiMessages(messages);

    if (apiMessages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const safeIndustry = VALID_INDUSTRIES.has(industry) ? industry : "other";

    const response = await anthropicClient.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 450,
      system: buildSystemPrompt(businessName, businessInfo, safeIndustry),
      messages: apiMessages,
    });

    const message = extractText(response.content);

    if (!message) {
      return NextResponse.json({ error: "No response from the model" }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[api/chat-preview] error:", error);
    return NextResponse.json({ error: "Unable to process your request. Please try again." }, { status: 500 });
  }
}
