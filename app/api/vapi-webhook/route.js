import { timingSafeEqual } from "crypto";
import { NextResponse, after } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
import { sendNewBookingNotification } from "../../../lib/email";

// Needs Node crypto (timingSafeEqual) and outbound fetch to api.vapi.ai — not
// available on the Edge runtime.
export const runtime = "nodejs";

const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
const SAVE_BOOKING_TOOL_NAME = "save_booking";

// Vapi echoes back whatever secret was set on the tool's `server.secret`
// field (scripts/sync-vapi-assistant.js sets it) as the literal `x-vapi-secret`
// header on every webhook call to that tool's server URL. This is a shared
// secret, not an HMAC signature — see PART C of the report for sources.
function verifySecret(received, expected) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// The assistant is a single shared Vapi resource synced for one client at a
// time (see scripts/sync-vapi-assistant.js) — there's no per-call client_id
// in the webhook payload itself, so we resolve "whose call is this" by
// reading back the `metadata.client_id` the sync script stamped on the
// assistant. This only works because exactly one client is ever live on this
// assistant at once. See the report for the multi-client rework needed.
async function resolveClientId(assistantId) {
  if (!assistantId || !VAPI_PRIVATE_KEY) return null;
  try {
    const resp = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { Authorization: `Bearer ${VAPI_PRIVATE_KEY}` },
    });
    if (!resp.ok) return null;
    const assistant = await resp.json();
    return assistant?.metadata?.client_id ?? null;
  } catch (err) {
    console.error("[vapi-webhook] failed to resolve client_id from assistant metadata:", err);
    return null;
  }
}

// Registered via after() at the call site, not awaited inline — runs once
// the webhook response has already been sent to Vapi (which is waiting on
// it mid-call), but after() guarantees it still runs to completion instead
// of racing the serverless instance freezing right after the response
// flushes, the way a bare fire-and-forget call would.
async function notifyBooking(row) {
  try {
    let businessName = null;
    if (row.client_id) {
      const db = adminClient();
      const { data } = await db
        .from("chatbots")
        .select("config")
        .eq("client_id", row.client_id)
        .maybeSingle();
      businessName = data?.config?.businessName || null;
    }
    await sendNewBookingNotification({ businessName, clientId: row.client_id, ...row });
  } catch (err) {
    console.error("[vapi-webhook] booking notification failed:", err);
  }
}

export async function POST(request) {
  try {
    const expectedSecret = process.env.VAPI_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error("[vapi-webhook] VAPI_WEBHOOK_SECRET is not configured — rejecting all requests");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 401 });
    }

    const receivedSecret = request.headers.get("x-vapi-secret");
    if (!verifySecret(receivedSecret, expectedSecret)) {
      console.error("[vapi-webhook] rejected — missing or invalid x-vapi-secret header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const message = body?.message;

    // Only tool-calls messages are relevant here (this URL is only wired to
    // the save_booking tool's own server.url, not the assistant-level server
    // URL) — anything else is a no-op, never an error.
    if (!message || message.type !== "tool-calls") {
      return NextResponse.json({ results: [] });
    }

    const toolCalls = Array.isArray(message.toolCallList) ? message.toolCallList : [];
    const callId = message.call?.id ?? null;
    const assistantId = message.call?.assistantId ?? VAPI_ASSISTANT_ID;
    const clientId = await resolveClientId(assistantId);
    if (!clientId) {
      console.error(
        `[vapi-webhook] could not resolve client_id for assistant ${assistantId} — saving booking with client_id=null`
      );
    }

    const results = [];
    for (const call of toolCalls) {
      // Vapi's actual toolCallList item nests the function name/arguments
      // under `.function` (not flat `call.name`/`call.parameters`, despite
      // some Vapi docs showing a flat shape).
      if (call.function?.name !== SAVE_BOOKING_TOOL_NAME) {
        results.push({ toolCallId: call.id, result: "Unsupported tool." });
        continue;
      }

      const params = call.function?.arguments || {};
      const row = {
        client_id: clientId,
        caller_name: params.caller_name ?? null,
        caller_phone: params.caller_phone ?? null,
        service: params.service ?? null,
        requested_time: params.requested_time ?? null,
        type: params.type === "message" ? "message" : "booking",
        call_id: callId,
      };

      try {
        const db = adminClient();
        const { error } = await db.from("bookings").insert(row);
        if (error) throw new Error(error.message);

        results.push({ toolCallId: call.id, result: "Saved." });
        after(() => notifyBooking(row));
      } catch (err) {
        console.error("[vapi-webhook] failed to save booking:", err);
        results.push({
          toolCallId: call.id,
          result: "There was a problem saving that — let the caller know the team will follow up directly.",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[vapi-webhook] unhandled error:", err);
    // Never let an unexpected error break the live call — respond 200 with
    // no results rather than a 500.
    return NextResponse.json({ results: [] });
  }
}
