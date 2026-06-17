import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../lib/supabase";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";

// Needed so widget.js running on third-party sites can fetch config cross-origin.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(request) {
  const clientIp = getClientIp(request);

  if (await isIpBlocked(clientIp)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403, headers: CORS_HEADERS });
  }

  const { allowed } = await checkRateLimit(clientIp, "/api/widget", 30, 60);
  if (!allowed) {
    await autoBlockIfAbusive(clientIp);
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS_HEADERS });
  }

  const id = request.nextUrl.searchParams.get("id");

  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400, headers: CORS_HEADERS });
  }
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id.trim())) {
    return NextResponse.json({ error: "Invalid id parameter" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("chatbots")
      .select("config")
      .eq("client_id", id.trim())
      .maybeSingle();

    if (error) {
      console.error("Supabase widget fetch error:", error);
      return NextResponse.json({ error: "Failed to load chatbot config" }, { status: 500, headers: CORS_HEADERS });
    }

    if (!data?.config) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(data.config, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("Widget API error:", err);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500, headers: CORS_HEADERS });
  }
}
