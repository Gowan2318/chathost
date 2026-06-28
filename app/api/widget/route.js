import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../../lib/supabase";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function makeSessionId(ip, clientId) {
  // Simple stable-enough session proxy — not cryptographically strong,
  // just needs to group events from the same load within a short window.
  var bucket = Math.floor(Date.now() / 1800000); // 30-min buckets
  return `${ip}-${clientId}-${bucket}`;
}

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
      .select("config, subscription_status")
      .eq("client_id", id.trim())
      .maybeSingle();

    if (error) {
      console.error("Supabase widget fetch error:", error);
      return NextResponse.json({ error: "Failed to load chatbot config" }, { status: 500, headers: CORS_HEADERS });
    }

    if (!data?.config) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404, headers: CORS_HEADERS });
    }

    // null = just created, Stripe webhook not yet fired — allow through so /success works immediately.
    const status = data.subscription_status;
    if (status !== null && status !== "active" && status !== "trialing") {
      return NextResponse.json({ error: "Subscription inactive" }, { status: 402, headers: CORS_HEADERS });
    }

    // Fire-and-forget load event
    const sessionId = makeSessionId(clientIp, id.trim());
    adminClient().from("widget_events").insert({
      client_id: id.trim(),
      session_id: sessionId,
      event_type: "loaded",
    }).then(() => {}).catch(() => {});

    return NextResponse.json({ ...data.config, _sessionId: sessionId }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("Widget API error:", err);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500, headers: CORS_HEADERS });
  }
}
