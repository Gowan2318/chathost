import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOnboardingEmail, sendNewSignupNotification, sendPaymentFailedNotification } from "../../../lib/email";

// Must run on Node.js runtime — Edge runtime doesn't support the Stripe SDK's
// crypto primitives needed for webhook signature verification.
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Fire-and-forget — resolves the owner's email via Supabase auth and sends the
// welcome email. Never awaited by the caller so it can't slow the webhook response.
async function sendOnboardingNotification(db, userId, businessName, plan, clientId) {
  if (!userId) return;
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    const ownerEmail = data?.user?.email;
    if (error || !ownerEmail) return;

    console.log("[stripe-webhook] sending onboarding email to:", ownerEmail);
    await sendOnboardingEmail({ ownerEmail, businessName, plan, clientId });
    await sendNewSignupNotification({ ownerEmail, businessName, plan, clientId });
  } catch (err) {
    console.error("[stripe-webhook] onboarding email failed:", err);
  }
}

// Fire-and-forget — mirrors sendOnboardingNotification but for a failed-payment alert to the founder.
async function sendPaymentFailedNotificationTask(db, userId, businessName, plan, clientId, failureReason) {
  if (!userId) return;
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    const ownerEmail = data?.user?.email;
    if (error || !ownerEmail) return;

    await sendPaymentFailedNotification({ ownerEmail, businessName, plan, clientId, failureReason });
  } catch (err) {
    console.error("[stripe-webhook] payment failed notification error:", err);
  }
}

export async function POST(req) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = adminClient();

  // Idempotency guard: skip if we've already processed this Stripe event
  const { data: existing } = await db
    .from("subscription_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existing) {
    console.log("[stripe-webhook] duplicate event, skipping:", event.id);
    return NextResponse.json({ received: true });
  }

  let resolvedClientId = null;
  let resolvedCustomerId = null;
  let newStatus = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clientId = session.client_reference_id;
        const stripeCustomerId = session.customer;
        resolvedClientId = clientId;
        resolvedCustomerId = stripeCustomerId;
        newStatus = "active";

        if (!clientId) {
          console.warn("[stripe-webhook] checkout.session.completed missing client_reference_id");
          break;
        }

        const updateFields = { subscription_status: "active" };
        if (stripeCustomerId) {
          updateFields.stripe_customer_id = stripeCustomerId;
        } else {
          console.warn(
            "[stripe-webhook] checkout.session.completed has no session.customer — stripe_customer_id not updated. Session ID:",
            session.id
          );
        }

        // Determine plan from amount_total: Basic ~$32-$40 (<4500 cents), Pro ~$48-$60 (>=4500 cents)
        const amountTotal = session.amount_total ?? null;
        const plan = amountTotal === null ? null : amountTotal < 4500 ? "basic" : "pro";

        const subscriptionId = session.subscription;
        let periodStart = null;
        let periodEnd = null;

        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            periodStart = new Date(subscription.current_period_start * 1000).toISOString();
            periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          } catch (e) {
            console.warn("[stripe-webhook] could not retrieve subscription:", e.message);
          }
        }

        updateFields.plan = plan;
        updateFields.stripe_subscription_id = subscriptionId ?? null;
        updateFields.current_period_start = periodStart;
        updateFields.current_period_end = periodEnd;

        // Resolve which chatbot row to update. Normally the row already exists
        // (created by the builder flow before checkout), so an update filtered
        // on client_id finds it directly. If not — e.g. a customer upgrading
        // whose checkout session was created against a different/stale
        // client_id — fall back to matching on stripe_customer_id so we don't
        // silently no-op the update.
        let chatbot = null;
        let error = null;

        const byClientId = await db
          .from("chatbots")
          .update(updateFields)
          .eq("client_id", clientId)
          .select("user_id, config, client_id")
          .maybeSingle();
        error = byClientId.error;

        if (byClientId.data) {
          chatbot = byClientId.data;
          console.log("[stripe-webhook] new subscription for:", clientId);
        } else if (stripeCustomerId) {
          const byCustomerId = await db
            .from("chatbots")
            .update(updateFields)
            .eq("stripe_customer_id", stripeCustomerId)
            .select("user_id, config, client_id")
            .maybeSingle();
          error = byCustomerId.error;

          if (byCustomerId.data) {
            chatbot = byCustomerId.data;
            console.log("[stripe-webhook] upgrade detected for existing customer:", chatbot.client_id);
          }
        }

        if (!chatbot) {
          console.warn(
            "[stripe-webhook] no chatbot row found by client_id or stripe_customer_id — new chatbot should already exist from builder flow:",
            clientId
          );
        }

        if (error) {
          console.error("[stripe-webhook] DB update failed (checkout.session.completed):", error);
        }

        // The row actually updated may carry a different client_id than the
        // session's (see stripe_customer_id fallback above) — use it for
        // anything referencing the chatbot going forward.
        const resolvedRowClientId = chatbot?.client_id ?? clientId;
        resolvedClientId = resolvedRowClientId;

        sendOnboardingNotification(
          db,
          chatbot?.user_id,
          chatbot?.config?.businessName ?? "your business",
          plan,
          resolvedRowClientId
        );

        // Upsert payment transaction — idempotent via ON CONFLICT on stripe_session_id
        const { error: txError } = await db
          .from("payment_transactions")
          .upsert(
            {
              client_id: resolvedRowClientId,
              stripe_session_id: session.id,
              stripe_customer_id: stripeCustomerId ?? null,
              amount: amountTotal,
              currency: session.currency ?? "usd",
              status: "completed",
              plan,
            },
            { onConflict: "stripe_session_id" }
          );

        if (txError) {
          console.error("[stripe-webhook] payment_transactions upsert failed:", txError);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        if (!sub.customer) {
          console.warn("[stripe-webhook] missing sub.customer on", event.type, event.id);
          break;
        }
        if (!sub.status) {
          console.warn("[stripe-webhook] missing sub.status on", event.id);
          break;
        }
        resolvedCustomerId = sub.customer;
        newStatus = sub.status;

        const { data: bot } = await db
          .from("chatbots")
          .select("client_id")
          .eq("stripe_customer_id", sub.customer)
          .maybeSingle();
        resolvedClientId = bot?.client_id ?? null;

        const subUpdateFields = { subscription_status: sub.status };
        if (sub.current_period_start) {
          subUpdateFields.current_period_start = new Date(sub.current_period_start * 1000).toISOString();
        }
        if (sub.current_period_end) {
          subUpdateFields.current_period_end = new Date(sub.current_period_end * 1000).toISOString();
        }

        // Plan may have changed (upgrade/downgrade) — re-derive it from the current price.
        const priceAmount = sub.items?.data?.[0]?.price?.unit_amount ?? null;
        if (priceAmount !== null) {
          subUpdateFields.plan = priceAmount < 4500 ? "basic" : "pro";
        }

        const { error } = await db
          .from("chatbots")
          .update(subUpdateFields)
          .eq("stripe_customer_id", sub.customer);

        if (error) {
          console.error("[stripe-webhook] DB update failed (subscription.updated):", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        if (!sub.customer) {
          console.warn("[stripe-webhook] missing sub.customer on", event.type, event.id);
          break;
        }
        resolvedCustomerId = sub.customer;
        newStatus = "canceled";

        const { data: bot } = await db
          .from("chatbots")
          .select("client_id")
          .eq("stripe_customer_id", sub.customer)
          .maybeSingle();
        resolvedClientId = bot?.client_id ?? null;

        const { error } = await db
          .from("chatbots")
          .update({ subscription_status: "canceled" })
          .eq("stripe_customer_id", sub.customer);

        if (error) {
          console.error("[stripe-webhook] DB update failed (subscription.deleted):", error);
        }

        // Mark payment as refunded only when we can confirm a refund was issued.
        // Stripe fires charge.refunded separately for actual refunds, but
        // an immediate cancellation (cancel_at_period_end: false, ended within
        // the same period it started) is a strong signal a refund accompanied it.
        // For confirmed refunds, listen to charge.refunded and update there.
        // Here we mark refunded when cancel_at_period_end was false AND the
        // event's previous_attributes show it was active just before deletion.
        const prevAttrs = event.data.previous_attributes ?? {};
        const wasImmediatelyCanceled = sub.cancel_at_period_end === false;
        const hadActiveStatus = prevAttrs.status === "active" || sub.status === "canceled";
        if (wasImmediatelyCanceled && hadActiveStatus) {
          const { error: refundErr } = await db
            .from("payment_transactions")
            .update({ status: "refunded", updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", sub.customer)
            .eq("status", "completed");

          if (refundErr) {
            console.error("[stripe-webhook] payment_transactions refund update failed:", refundErr);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer;
        if (!stripeCustomerId) {
          console.warn("[stripe-webhook] invoice.payment_failed missing customer", event.id);
          break;
        }
        resolvedCustomerId = stripeCustomerId;
        newStatus = "past_due";

        const { data: bot } = await db
          .from("chatbots")
          .select("client_id, user_id, config, plan")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();
        resolvedClientId = bot?.client_id ?? null;

        console.log("[stripe-webhook] payment failed for customer:", stripeCustomerId);

        if (bot) {
          const failureReason = invoice.last_finalization_error?.message ?? null;
          sendPaymentFailedNotificationTask(
            db,
            bot.user_id,
            bot.config?.businessName ?? "your business",
            bot.plan ?? bot.config?.plan ?? null,
            bot.client_id,
            failureReason
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Log but don't re-throw — always return 200 so Stripe doesn't retry unnecessarily.
    console.error("[stripe-webhook] handler error:", err);
  }

  // Audit trail — fire-and-forget, never block the webhook response
  db.from("subscription_events").insert({
    client_id: resolvedClientId,
    stripe_customer_id: resolvedCustomerId,
    stripe_event_id: event.id,
    event_type: event.type,
    new_status: newStatus,
    stripe_data: event.data.object,
  }).then(() => {}).catch(() => {});

  return NextResponse.json({ received: true });
}
