import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_REQUESTS_PER_MINUTE = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** @type {Map<string, { count: number, windowStart: number }>} */
const rateLimitStore = new Map();
let lastCleanup = Date.now();

function corsJson(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...init.headers,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

function cleanupRateLimitStore(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}

function isRateLimited(ip) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return true;
  }

  entry.count += 1;
  return false;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function toApiMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  const normalized = messages
    .filter((msg) => msg?.role === "user" || msg?.role === "assistant")
    .map((msg) => ({
      role: msg.role,
      content: String(msg.content ?? ""),
    }))
    .filter((msg) => msg.content.length > 0);

  let start = 0;
  while (start < normalized.length && normalized[start].role === "assistant") {
    start += 1;
  }

  return normalized.slice(start);
}

function extractText(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    if (isRateLimited(clientIp)) {
      return corsJson(
        { error: "Too many requests, please try again in a minute" },
        { status: 429 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return corsJson(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
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
      system: `You are a helpful customer service assistant for ${businessName ?? "this business"}. Only answer questions using this business information: ${businessInfo ?? ""}. Keep answers short and friendly. If you don't know something say "Please call us directly for that!"`,
      messages: apiMessages,
    });

    const message = extractText(response.content);

    if (!message) {
      return corsJson({ error: "No response from the model" }, { status: 500 });
    }

    return corsJson({ message });
  } catch (error) {
    console.error("API Error:", error);
    return corsJson(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
