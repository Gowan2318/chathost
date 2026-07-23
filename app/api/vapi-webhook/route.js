import { timingSafeEqual } from "crypto";
import { NextResponse, after } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
import { sendNewBookingNotification } from "../../../lib/email";

// Needs Node crypto (timingSafeEqual) and outbound fetch to api.vapi.ai — not
// available on the Edge runtime.
export const runtime = "nodejs";

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

// Each client now has their own dedicated Vapi assistant, tracked in
// chatbots.vapi_assistant_id (see scripts/sync-vapi-assistant.js). We resolve
// "whose call is this" with a direct DB lookup on that column rather than
// calling Vapi's GET /assistant to read back `metadata.client_id` — the DB
// lookup is faster (no extra external round-trip while a live call is
// waiting on this response), has one less external dependency (doesn't rely
// on the Vapi API being reachable/authenticated at call time), and reads the
// same table already being queried for the booking's business name.
async function resolveClientId(assistantId) {
  if (!assistantId) return null;
  try {
    const db = adminClient();
    const { data, error } = await db
      .from("chatbots")
      .select("client_id")
      .eq("vapi_assistant_id", assistantId)
      .maybeSingle();
    if (error) {
      console.error("[vapi-webhook] Supabase error resolving client_id from vapi_assistant_id:", error.message);
      return null;
    }
    return data?.client_id ?? null;
  } catch (err) {
    console.error("[vapi-webhook] failed to resolve client_id from vapi_assistant_id:", err);
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
    const assistantId = message.call?.assistantId ?? null;
    const clientId = await resolveClientId(assistantId);
    if (!clientId) {
      console.error(
        `[vapi-webhook] could not resolve client_id for assistant ${assistantId} — refusing to save booking(s) for call ${callId}`
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

      // Never write a booking we can't attribute to a client — that would
      // silently land in no client's dashboard (or, worse, be ambiguous
      // about which one). Fail loudly instead of saving with a null/wrong
      // client_id.
      if (!clientId) {
        results.push({
          toolCallId: call.id,
          result: "There was a problem saving that — let the caller know the team will follow up directly.",
        });
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
