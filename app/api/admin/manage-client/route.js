import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getServerAuthState } from "../../../../lib/supabase-server";
import { isFounder } from "../../../../lib/founder";
import { getClientIp, isIpBlocked, checkRateLimit, autoBlockIfAbusive } from "../../../../lib/rateLimit";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTION_STATUS = { pause: "paused", resume: "active", cancel: "canceled" };

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export async function POST(request) {
  const clientIp = getClientIp(request);

  if (await isIpBlocked(clientIp)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(clientIp, "/api/admin/manage-client", 20, 60);
  if (!allowed) {
    await autoBlockIfAbusive(clientIp);
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  // Founder-only, and the session must have completed the TOTP challenge
  // (aal2) — mirrors the /admin page's own gate, since this route mutates
  // client subscriptions and isn't covered by middleware's /admin path match
  // (middleware always passes /api/* requests through).
  const { user, aalLevel } = await getServerAuthState();
  if (!user || !isFounder(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (aalLevel !== "aal2") {
    return NextResponse.json({ error: "MFA verification required" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientId, action } = body;

  if (!clientId || !UUID_RE.test(clientId)) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
  }
  if (!Object.prototype.hasOwnProperty.call(ACTION_STATUS, action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = adminClient();
  const newStatus = ACTION_STATUS[action];

  if (action === "cancel") {
    const { data: chatbot } = await db
      .from("chatbots")
      .select("stripe_subscription_id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (chatbot?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(chatbot.stripe_subscription_id);
      } catch (err) {
        // Don't fail the whole request — the DB status update below still
        // stops the chatbot from responding even if Stripe cancellation
        // failed (e.g. already canceled there); founder can retry in Stripe.
        console.error(`[admin] Stripe cancel failed for clientId ${clientId}:`, err.message);
      }
    }
  }

  const { error } = await db
    .from("chatbots")
    .update({ subscription_status: newStatus })
    .eq("client_id", clientId);

  if (error) {
    console.error(`[admin] failed to update clientId ${clientId} to ${newStatus}:`, error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }

  console.log(`[admin] clientId ${clientId} action: ${action} by founder`);

  return NextResponse.json({ success: true, clientId, action, newStatus });
}
