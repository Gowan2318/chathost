import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

const VALID_EVENT_TYPES = new Set(["booking_clicked", "payment_clicked"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsJson(body, init = {}) {
  return NextResponse.json(body, { ...init, headers: { ...CORS_HEADERS, ...init.headers } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    if (await isIpBlocked(clientIp)) {
      return corsJson({ error: "Access denied" }, { status: 403 });
    }

    const { allowed } = await checkRateLimit(clientIp, "/api/track-event", 30, 60);
    if (!allowed) {
      await autoBlockIfAbusive(clientIp);
      return corsJson({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { client_id, session_id, event_type } = body;

    if (!client_id || !UUID_RE.test(String(client_id))) {
      return corsJson({ error: "Invalid client_id" }, { status: 400 });
    }
    if (!session_id || typeof session_id !== "string" || session_id.length > 200) {
      return corsJson({ error: "Invalid session_id" }, { status: 400 });
    }
    if (!VALID_EVENT_TYPES.has(event_type)) {
      return corsJson({ error: "Invalid event_type" }, { status: 400 });
    }

    const db = adminClient();

    await Promise.all([
      db.from("widget_events").insert({ client_id, session_id, event_type }),
      db.from("leads").insert({ client_id, session_id, action_type: event_type }),
    ]);

    return corsJson({ ok: true });
  } catch (err) {
    console.error("[api/track-event] error:", err);
    return corsJson({ error: "Failed to record event" }, { status: 500 });
  }
}
