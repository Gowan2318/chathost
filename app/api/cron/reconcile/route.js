import { timingSafeEqual } from "crypto";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { adminClient } from "../../../../lib/supabase-admin";
import { voicePlanFromAmount } from "../../../../lib/plans";

// Must run on Node.js runtime — Edge runtime doesn't support the Stripe SDK
// (and, below, Node's crypto.timingSafeEqual).
export const runtime = "nodejs";

// Vercel Cron always invokes the configured path with GET, and (when
// CRON_SECRET is set as a project env var) automatically attaches it as
// `Authorization: Bearer <CRON_SECRET>` — verified below.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Same constant-time comparison pattern as app/api/vapi-webhook/route.js's
// verifySecret — a plain !== comparison short-circuits on the first
// mismatched byte, which leaks a timing signal an attacker could use to
// guess CRON_SECRET one byte at a time.
function verifySecret(received, expected) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Matched against lib/plans.js VOICE_PLANS (single source of truth for plan
// pricing) rather than a hardcoded amount threshold — returns null for an
// unrecognized amount, which the caller treats as "no update, don't guess."
function planFromSubscription(subscription) {
  const priceAmount = subscription?.items?.data?.[0]?.price?.unit_amount ?? null;
  return voicePlanFromAmount(priceAmount);
}

// Finds the current Stripe subscription for a chatbot row. Prefers the
// stored stripe_subscription_id; falls back to the customer's most recent
// subscription of any status — covers rows left stale by a missed/failed
// webhook, or created before stripe_subscription_id was tracked.
async function findSubscription(bot) {
  if (bot.stripe_subscription_id) {
    try {
      return await stripe.subscriptions.retrieve(bot.stripe_subscription_id);
    } catch (err) {
      if (err?.code !== "resource_missing") throw err;
      // Stored ID no longer resolves — fall through to the customer lookup.
    }
  }

  const list = await stripe.subscriptions.list({
    customer: bot.stripe_customer_id,
    status: "all",
    limit: 1,
  });
  return list.data[0] ?? null;
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const receivedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!verifySecret(receivedSecret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = adminClient();
  const { data: chatbots, error: fetchError } = await db
    .from("chatbots")
    .select("client_id, stripe_customer_id, stripe_subscription_id, subscription_status, plan")
    .not("stripe_customer_id", "is", null);

  if (fetchError) {
    console.error("[cron/reconcile] failed to fetch chatbots:", fetchError);
    return NextResponse.json({ error: "Failed to fetch chatbots" }, { status: 500 });
  }

  let checked = 0;
  let fixed = 0;
  const errors = [];

  for (const bot of chatbots ?? []) {
    checked += 1;
    try {
      const subscription = await findSubscription(bot);
      // No subscription found in Stripe at all → treat as canceled.
      const stripeStatus = subscription?.status ?? "canceled";

      const updateFields = {};
      if (bot.subscription_status !== stripeStatus) {
        updateFields.subscription_status = stripeStatus;
      }

      if (subscription) {
        if (subscription.current_period_start) {
          updateFields.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
        }
        if (subscription.current_period_end) {
          updateFields.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
        }

        // Compared against bot.plan only — not bot.config?.plan, which is the
        // builder's "basic"/"pro" config-complexity toggle, a different axis
        // that happens to share the string "pro" with a real billing plan.
        const plan = planFromSubscription(subscription);
        if (plan && plan !== bot.plan) {
          updateFields.plan = plan;
        }

        if (subscription.id !== bot.stripe_subscription_id) {
          updateFields.stripe_subscription_id = subscription.id;
        }
      }

      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await db
          .from("chatbots")
          .update(updateFields)
          .eq("client_id", bot.client_id);

        if (updateError) throw updateError;

        fixed += 1;
        console.log(`[cron/reconcile] fixed ${bot.client_id}:`, JSON.stringify(updateFields));
      }
    } catch (err) {
      console.error(`[cron/reconcile] error reconciling ${bot.client_id}:`, err);
      errors.push({ client_id: bot.client_id, error: err.message || String(err) });
    }
  }

  console.log(`[cron/reconcile] checked ${checked}, fixed ${fixed}, errors ${errors.length}`);

  return NextResponse.json({ checked, fixed, errors });
}
