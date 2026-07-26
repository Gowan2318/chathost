import { Webhook } from "svix";
import { NextResponse } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
import { sendResendBounceAlert } from "../../../lib/email";

// Needs Node crypto (svix's HMAC verification) — not available on the Edge runtime.
export const runtime = "nodejs";

const ALERT_EVENT_TYPES = new Set(["email.bounced", "email.complained"]);

function extractRecipient(data) {
  if (Array.isArray(data?.to) && data.to.length > 0) return data.to[0];
  if (typeof data?.to === "string") return data.to;
  return null;
}

// Client notifications (bookings, payment/voice-paused alerts, onboarding) go
// to the client's Supabase Auth email, not chatbots.config.supportEmail (see
// resolveOwnerEmail in app/api/vapi-webhook/route.js) — so resolving "whose
// address is this" means searching auth users by email first, then joining
// to chatbots.user_id. Supabase's admin listUsers() has no email filter
// (confirmed against @supabase/auth-js's GoTrueAdminApi — page/perPage only),
// so this pages through all users. Fine at this project's current scale;
// revisit if the user base grows large enough to matter.
async function resolveClientByAuthEmail(db, normalizedEmail) {
  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[resend-webhook] listUsers failed:", error.message);
      return null;
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (match) {
      // An auth user can own more than one chatbots row (dev/test accounts
      // in this project's own data do) — .maybeSingle() would throw on that,
      // so mirror app/dashboard/page.js's convention of taking the most
      // recently created row instead of asserting uniqueness.
      const { data: bots } = await db
        .from("chatbots")
        .select("client_id, config")
        .eq("user_id", match.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const bot = bots?.[0];
      if (!bot) return null;
      return { clientId: bot.client_id, businessName: bot.config?.businessName ?? null, matchedVia: "auth_email" };
    }
    if (data.users.length < perPage) return null; // last page, no match
    page += 1;
  }
  return null;
}

// Fallback for addresses that aren't tied to a Supabase Auth user (e.g. a
// business's own contact address) — best-effort only, per the task's "if
// resolvable" ask.
async function resolveClientBySupportEmail(db, email) {
  const { data: bot } = await db
    .from("chatbots")
    .select("client_id, config")
    .eq("config->>supportEmail", email)
    .maybeSingle();
  if (!bot) return null;
  return { clientId: bot.client_id, businessName: bot.config?.businessName ?? null, matchedVia: "support_email" };
}

async function resolveClientByEmail(db, email) {
  if (!email) return null;
  try {
    const byAuth = await resolveClientByAuthEmail(db, email.toLowerCase());
    if (byAuth) return byAuth;
  } catch (err) {
    console.error("[resend-webhook] auth-email lookup failed:", err);
  }
  try {
    return await resolveClientBySupportEmail(db, email);
  } catch (err) {
    console.error("[resend-webhook] support-email lookup failed:", err);
    return null;
  }
}

// Best-effort — flags the client's row so the admin dashboard can eventually
// surface "this client's email is bouncing." Only applied when we matched a
// real client row (not the founder inbox or a pre-signup address).
async function flagChatbotEmailBounced(db, clientId, eventType) {
  try {
    const { error } = await db
      .from("chatbots")
      .update({
        notification_email_bounced: true,
        notification_email_bounced_at: new Date().toISOString(),
        notification_email_bounce_type: eventType,
      })
      .eq("client_id", clientId);
    if (error) {
      // Most likely cause: migration 016 hasn't been run yet in this
      // environment. Log and move on — the founder alert email already
      // carries the same information.
      console.error(`[resend-webhook] failed to flag chatbots row ${clientId}:`, error.message);
    }
  } catch (err) {
    console.error(`[resend-webhook] failed to flag chatbots row ${clientId}:`, err);
  }
}

export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured — rejecting all requests");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 401 });
  }

  const rawBody = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id"),
    "svix-timestamp": request.headers.get("svix-timestamp"),
    "svix-signature": request.headers.get("svix-signature"),
  };

  let event;
  try {
    event = new Webhook(secret).verify(rawBody, svixHeaders);
  } catch (err) {
    console.error("[resend-webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (ALERT_EVENT_TYPES.has(event.type)) {
      const data = event.data ?? {};
      const recipientEmail = extractRecipient(data);
      const bounceType = data.bounce?.type ?? null;
      const bounceSubType = data.bounce?.subType ?? null;

      const db = adminClient();
      const resolved = await resolveClientByEmail(db, recipientEmail);

      await sendResendBounceAlert({
        recipientEmail,
        eventType: event.type,
        businessName: resolved?.businessName ?? null,
        clientId: resolved?.clientId ?? null,
        matchedVia: resolved?.matchedVia ?? null,
        bounceType,
        bounceSubType,
      });

      if (resolved?.clientId) {
        await flagChatbotEmailBounced(db, resolved.clientId, event.type);
      }

      console.log(`[resend-webhook] ${event.type} for ${recipientEmail ?? "unknown"} — client: ${resolved?.clientId ?? "unresolved"}`);
    }
  } catch (err) {
    // Log but don't re-throw — never let a processing error surface as a
    // failure Resend would retry on.
    console.error("[resend-webhook] handler error:", err);
  }

  return NextResponse.json({ received: true });
}
