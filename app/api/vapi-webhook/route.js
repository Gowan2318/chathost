import { timingSafeEqual } from "crypto";
import { NextResponse, after } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
import {
  sendNewBookingNotification,
  sendVoiceMinutesWarningEmail,
  sendVoiceMinutesLimitReachedEmail,
  sendVoiceMinutesClientLimitReachedEmail,
} from "../../../lib/email";
import { pauseVapiAssistant, resumeVapiAssistant } from "../../../lib/vapi-control";

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

// Same lookup pattern as app/api/stripe-webhook/route.js — the client's real
// account email is their Supabase auth email (resolved via chatbots.user_id),
// not config.supportEmail, which is the customer-facing contact address shown
// to THEIR customers and not necessarily monitored by the account owner.
async function resolveOwnerEmail(db, userId) {
  if (!userId) return null;
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    if (error) return null;
    return data?.user?.email ?? null;
  } catch {
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

// Vapi's end-of-call-report message has no duration field — confirmed
// against the SDK's ServerMessageEndOfCallReport type, which carries
// `startedAt`/`endedAt` ISO timestamps but nothing named duration*. Every
// other Vapi cost/timing field (Call.startedAt/endedAt) follows the same
// pattern, so this is the documented way to derive it, not a guess.
function durationMinutesFromReport(message) {
  const startedAt = message.startedAt ?? message.call?.startedAt;
  const endedAt = message.endedAt ?? message.call?.endedAt;
  if (!startedAt || !endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms / 60000;
}

// Voice minutes reset monthly. "New month" is judged in UTC against the
// stored voice_minutes_reset_at, matching the migration's UTC
// date_trunc('month', now()) default rather than any per-row local timezone.
function startOfUtcMonthIso(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function isNewUtcMonth(resetAt, now) {
  if (!resetAt) return true;
  const reset = new Date(resetAt);
  return reset.getUTCFullYear() !== now.getUTCFullYear() || reset.getUTCMonth() !== now.getUTCMonth();
}

// Tracks per-client voice usage for cost control (Vapi runs ~$0.20/min
// all-in), fires founder alerts at 80%/100% of the client's monthly cap, and
// auto-pauses the assistant (voice_paused=true + detached from its phone
// number, see lib/vapi-control.js) the moment usage crosses the cap — no
// overage billing. On a new billing month, a previously-paused assistant is
// automatically re-enabled and the pause flag cleared. Never throws: errors
// are logged and swallowed so a tracking hiccup can't affect the
// (already-ended) call or crash the webhook.
async function handleEndOfCallReport(message) {
  try {
    const assistantId = message.call?.assistantId ?? null;
    const clientId = await resolveClientId(assistantId);
    if (!clientId) {
      console.error(`[vapi-webhook] end-of-call-report: could not resolve client_id for assistant ${assistantId}`);
      return;
    }

    const durationMinutes = durationMinutesFromReport(message);
    if (durationMinutes === null) {
      console.error(
        `[vapi-webhook] end-of-call-report: missing/invalid startedAt or endedAt for call ${message.call?.id ?? "?"} — skipping minute tracking`
      );
      return;
    }

    const db = adminClient();
    const { data: bot, error: fetchError } = await db
      .from("chatbots")
      .select(
        "config, user_id, vapi_assistant_id, vapi_phone_number, voice_plan, voice_paused, voice_minutes_limit, voice_minutes_used, voice_minutes_reset_at"
      )
      .eq("client_id", clientId)
      .maybeSingle();
    if (fetchError || !bot) {
      console.error(`[vapi-webhook] end-of-call-report: failed to load chatbots row for ${clientId}:`, fetchError?.message);
      return;
    }

    const now = new Date();
    const newMonth = isNewUtcMonth(bot.voice_minutes_reset_at, now);
    const usedBefore = newMonth ? 0 : Number(bot.voice_minutes_used) || 0;
    const usedAfter = usedBefore + durationMinutes;
    const resetAt = newMonth ? startOfUtcMonthIso(now) : bot.voice_minutes_reset_at;
    const limit = bot.voice_minutes_limit;

    // Crossing-based gates (fire exactly once, on the call that takes usage
    // over the line) — mirrors the pre-existing 80% warning pattern just
    // below. A monthly reset always clears the pause; a cap-crossing always
    // sets it. Both can't really happen on the same call in practice (a
    // reset zeroes usedBefore first), but if they somehow did, the pause
    // takes precedence since it reflects usedAfter, the truth as of now.
    const shouldResume = newMonth && bot.voice_paused;
    const shouldPause =
      typeof limit === "number" && limit > 0 && usedBefore < limit && usedAfter >= limit;

    const updatePayload = { voice_minutes_used: usedAfter, voice_minutes_reset_at: resetAt };
    if (shouldResume) updatePayload.voice_paused = false;
    if (shouldPause) updatePayload.voice_paused = true;

    const { error: updateError } = await db
      .from("chatbots")
      .update(updatePayload)
      .eq("client_id", clientId);
    if (updateError) {
      console.error(`[vapi-webhook] end-of-call-report: failed to update voice_minutes_used for ${clientId}:`, updateError.message);
      return;
    }

    const businessName = bot.config?.businessName || null;

    if (shouldResume) {
      console.log(`[vapi-webhook] new billing month for ${clientId} — re-enabling previously paused voice assistant`);
      const summary = await resumeVapiAssistant({
        clientId,
        assistantId: bot.vapi_assistant_id,
        phoneNumber: bot.vapi_phone_number,
      });
      console.log(`[vapi-webhook] resumeVapiAssistant summary for ${clientId}:`, JSON.stringify(summary));
    }

    if (typeof limit === "number" && limit > 0) {
      const eightyPct = limit * 0.8;
      if (usedBefore < eightyPct && usedAfter >= eightyPct) {
        after(() => sendVoiceMinutesWarningEmail({ businessName, clientId, used: usedAfter, limit }));
      }
      if (shouldPause) {
        console.log(`[vapi-webhook] ${clientId} hit voice minute cap (${usedAfter}/${limit}) — pausing voice assistant`);
        const summary = await pauseVapiAssistant({
          clientId,
          assistantId: bot.vapi_assistant_id,
          phoneNumber: bot.vapi_phone_number,
        });
        console.log(`[vapi-webhook] pauseVapiAssistant summary for ${clientId}:`, JSON.stringify(summary));

        after(() => sendVoiceMinutesLimitReachedEmail({ businessName, clientId, used: usedAfter, limit }));
        after(async () => {
          const ownerEmail = await resolveOwnerEmail(db, bot.user_id);
          if (!ownerEmail) {
            console.error(`[vapi-webhook] could not resolve owner email for ${clientId} — client-facing cap-reached email not sent`);
            return;
          }
          await sendVoiceMinutesClientLimitReachedEmail({ ownerEmail, businessName, voicePlan: bot.voice_plan });
        });
      }
    }
  } catch (err) {
    console.error("[vapi-webhook] end-of-call-report handling failed:", err);
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

    // This URL is wired two ways: the save_booking tool's own server.url
    // (delivers "tool-calls") and, since step 5, the assistant's own
    // server.url scoped via serverMessages to ONLY "end-of-call-report" (see
    // sync-vapi-assistant.js) — deliberately not overlapping, so no tool-call
    // is ever delivered twice. Anything else is a no-op, never an error.
    if (!message) {
      return NextResponse.json({ results: [] });
    }

    if (message.type === "end-of-call-report") {
      // The call has already ended by the time this fires — no live caller
      // is waiting on this response, so just await it inline (no need for
      // after(), unlike the mid-call tool-calls path below). Per Vapi's own
      // docs only assistant-request/tool-calls/transfer-destination-request
      // expect a meaningful response body; an empty object is a valid ack.
      await handleEndOfCallReport(message);
      return NextResponse.json({});
    }

    if (message.type !== "tool-calls") {
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
