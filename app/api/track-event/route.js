import { NextResponse } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
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

const VALID_EVENT_TYPES = new Set(["opened", "booking_clicked", "payment_clicked"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsJson(body, init = {}) {
  return NextResponse.json(body, { ...init, headers: { ...CORS_HEADERS, ...init.headers } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
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

    // leads only tracks actual lead-generating actions — its action_type
    // check constraint doesn't include "opened", so skip it for that event.
    const inserts = [db.from("widget_events").insert({ client_id, session_id, event_type })];
    if (event_type !== "opened") {
      inserts.push(db.from("leads").insert({ client_id, session_id, action_type: event_type }));
    }

    await Promise.all(inserts);

    return corsJson({ ok: true });
  } catch (err) {
    console.error("[api/track-event] error:", err);
    return corsJson({ error: "Failed to record event" }, { status: 500 });
  }
}
