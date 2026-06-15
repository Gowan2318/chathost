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
    const { messages, businessInfo, businessName } = body;

    const apiMessages = toApiMessages(messages);

    if (apiMessages.length === 0) {
      return corsJson({ error: "No messages provided" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `You are a helpful customer service assistant. Only answer questions about the business using the information in the tags below. Keep answers short and friendly. If you don't know something, say "Please call us directly for that!"\n\n<business_name>${businessName ?? "this business"}</business_name>\n<business_info>${businessInfo ?? ""}</business_info>`,
      messages: apiMessages,
    });

    const message = extractText(response.content);

    if (!message) {
      return corsJson({ error: "No response from the model" }, { status: 500 });
    }

    return corsJson({ message });
  } catch (error) {
    console.error("API Error:", error);
    return corsJson({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
