import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

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
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages, businessInfo, businessName } = body;

    const apiMessages = toApiMessages(messages);

    if (apiMessages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `You are a helpful customer service assistant for ${businessName ?? "this business"}. Only answer questions using this business information: ${businessInfo ?? ""}. Keep answers short and friendly. If you don't know something say "Please call us directly for that!"`,
      messages: apiMessages,
    });

    const message = extractText(response.content);

    if (!message) {
      return NextResponse.json(
        { error: "No response from the model" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
