import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Must run on Node.js runtime — Edge runtime doesn't support the Stripe SDK.
export const runtime = "nodejs";

// Vercel Cron always invokes the configured path with GET, and (when
// CRON_SECRET is set as a project env var) automatically attaches it as
// `Authorization: Bearer <CRON_SECRET>` — verified below.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function planFromSubscription(subscription) {
  const priceAmount = subscription?.items?.data?.[0]?.price?.unit_amount ?? null;
  return priceAmount === null ? null : priceAmount < 4500 ? "basic" : "pro";
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

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = adminClient();
  const { data: chatbots, error: fetchError } = await db
    .from("chatbots")
    .select("client_id, stripe_customer_id, stripe_subscription_id, subscription_status, plan, config")
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

        const plan = planFromSubscription(subscription);
        if (plan && plan !== (bot.plan ?? bot.config?.plan)) {
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
