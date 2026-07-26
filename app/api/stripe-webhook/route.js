import Stripe from "stripe";
import { NextResponse } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
import {
  sendOnboardingEmail,
  sendNewSignupNotification,
  sendPaymentFailedNotification,
  sendVoicePausedForBillingEmail,
  sendVoicePausedFounderAlert,
} from "../../../lib/email";
import { voicePlanFromAmount } from "../../../lib/plans";
import { pauseVapiAssistant, resumeVapiAssistant } from "../../../lib/vapi-control";

// Must run on Node.js runtime — Edge runtime doesn't support the Stripe SDK's
// crypto primitives needed for webhook signature verification.
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
async function sendPaymentFailedNotificationTask(db, userId, businessName, plan, clientId, failureReason, voicePaused) {
  if (!userId) return;
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    const ownerEmail = data?.user?.email;
    if (error || !ownerEmail) return;

    await sendPaymentFailedNotification({ ownerEmail, businessName, plan, clientId, failureReason, voicePaused });
  } catch (err) {
    console.error("[stripe-webhook] payment failed notification error:", err);
  }
}

// Fire-and-forget — resolves the owner's email and sends the client-facing
// "your voice assistant was paused" notice. Used for both subscription
// cancellation and (alongside the founder-facing payment-failed email) a
// failed invoice payment.
async function sendVoicePausedClientNotificationTask(db, userId, businessName, reason) {
  if (!userId) return;
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    const ownerEmail = data?.user?.email;
    if (error || !ownerEmail) return;

    await sendVoicePausedForBillingEmail({ ownerEmail, businessName, reason });
  } catch (err) {
    console.error("[stripe-webhook] voice-paused client notification error:", err);
  }
}

// Pauses a client's Vapi voice assistant (detaches phone number) and marks
// chatbots.voice_paused=true, but only if it isn't already paused — Stripe
// can redeliver/retry these events, and repeated identical Vapi PATCH calls
// and duplicate emails should be avoided. Returns true if this call actually
// performed the pause (so the caller knows whether to notify).
async function pauseVoiceForBilling(db, bot) {
  if (!bot || bot.voice_paused || !bot.vapi_assistant_id) return false;

  const { error: dbError } = await db
    .from("chatbots")
    .update({ voice_paused: true })
    .eq("client_id", bot.client_id);
  if (dbError) {
    console.error(`[stripe-webhook] failed to set voice_paused=true for ${bot.client_id}:`, dbError.message);
  }

  const summary = await pauseVapiAssistant({
    clientId: bot.client_id,
    assistantId: bot.vapi_assistant_id,
    phoneNumber: bot.vapi_phone_number,
  });
  console.log(`[stripe-webhook] pauseVapiAssistant summary for ${bot.client_id}:`, JSON.stringify(summary));
  return true;
}

// Mirrors pauseVoiceForBilling — resumes only if currently paused and an
// assistant is on file.
async function resumeVoiceForBilling(db, bot) {
  if (!bot || !bot.voice_paused || !bot.vapi_assistant_id) return false;

  const { error: dbError } = await db
    .from("chatbots")
    .update({ voice_paused: false })
    .eq("client_id", bot.client_id);
  if (dbError) {
    console.error(`[stripe-webhook] failed to set voice_paused=false for ${bot.client_id}:`, dbError.message);
  }

  const summary = await resumeVapiAssistant({
    clientId: bot.client_id,
    assistantId: bot.vapi_assistant_id,
    phoneNumber: bot.vapi_phone_number,
  });
  console.log(`[stripe-webhook] resumeVapiAssistant summary for ${bot.client_id}:`, JSON.stringify(summary));
  return true;
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

        // Determine plan from amount_total, matched against lib/plans.js VOICE_PLANS
        // (the single source of truth for plan pricing: $100 starter / $200 growth / $300 pro).
        const amountTotal = session.amount_total ?? null;
        const plan = voicePlanFromAmount(amountTotal);
        if (amountTotal !== null && plan === null) {
          console.warn(
            `[stripe-webhook] checkout.session.completed — amount_total ${amountTotal} cents did not match any known plan price; leaving plan unset. Session ID:`,
            session.id
          );
        }

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

        // Only overwrite plan when it resolved — an unknown amount shouldn't
        // clobber a previously-known plan value with null.
        if (plan !== null) updateFields.plan = plan;
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
        const updatedPlan = voicePlanFromAmount(priceAmount);
        if (priceAmount !== null && updatedPlan === null) {
          console.warn(
            `[stripe-webhook] customer.subscription.updated — price ${priceAmount} cents did not match any known plan price; leaving plan unset. Subscription ID:`,
            sub.id
          );
        }
        if (updatedPlan !== null) {
          subUpdateFields.plan = updatedPlan;
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
          .select("client_id, user_id, config, vapi_assistant_id, vapi_phone_number, voice_paused")
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

        // Pause the voice assistant — subscription is gone, so it shouldn't
        // keep answering calls. pauseVoiceForBilling no-ops (and returns
        // false) if it's already paused or there's no assistant on file.
        const businessName = bot?.config?.businessName ?? "your business";
        if (await pauseVoiceForBilling(db, bot)) {
          sendVoicePausedClientNotificationTask(db, bot.user_id, businessName, "your subscription ending");
          sendVoicePausedFounderAlert({ businessName, clientId: bot.client_id, reason: "Subscription canceled" })
            .catch((err) => console.error("[stripe-webhook] voice-paused founder alert failed:", err));
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
          .select("client_id, user_id, config, plan, vapi_assistant_id, vapi_phone_number, voice_paused")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();
        resolvedClientId = bot?.client_id ?? null;

        console.log("[stripe-webhook] payment failed for customer:", stripeCustomerId);

        if (bot) {
          const businessName = bot.config?.businessName ?? "your business";
          const justPaused = await pauseVoiceForBilling(db, bot);

          const failureReason = invoice.last_finalization_error?.message ?? null;
          // bot.plan only — not bot.config?.plan, which is the builder's
          // "basic"/"pro" config-complexity toggle, a different axis that
          // happens to share the string "pro" with a real billing plan.
          sendPaymentFailedNotificationTask(
            db,
            bot.user_id,
            businessName,
            bot.plan ?? null,
            bot.client_id,
            failureReason,
            justPaused
          );

          if (justPaused) {
            sendVoicePausedClientNotificationTask(db, bot.user_id, businessName, "a failed payment");
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (!invoice.customer) {
          console.warn("[stripe-webhook] invoice.payment_succeeded missing customer", event.id);
          break;
        }
        resolvedCustomerId = invoice.customer;
        newStatus = "active";

        const { data: bot } = await db
          .from("chatbots")
          .select("client_id, user_id, config, plan, vapi_assistant_id, vapi_phone_number, voice_paused")
          .eq("stripe_customer_id", invoice.customer)
          .maybeSingle();

        if (!bot) {
          console.warn("[stripe-webhook] invoice.payment_succeeded — no chatbot found for customer:", invoice.customer);
          break;
        }

        resolvedClientId = bot.client_id;

        // Update subscription status to active and sync period dates if available
        const updateFields = { subscription_status: "active" };

        if (invoice.lines?.data?.[0]?.period) {
          updateFields.current_period_start = new Date(invoice.lines.data[0].period.start * 1000).toISOString();
          updateFields.current_period_end = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
        }

        const { error } = await db
          .from("chatbots")
          .update(updateFields)
          .eq("client_id", bot.client_id);

        if (error) {
          console.error("[stripe-webhook] DB update failed (invoice.payment_succeeded):", error);
        }

        // A successful payment means any billing-driven pause (failed
        // payment or the subscription having lapsed) is no longer valid —
        // resumeVoiceForBilling no-ops if it wasn't paused or has no
        // assistant on file. Note: this doesn't distinguish "paused for
        // billing" from "paused for hitting the voice-minutes cap" (no
        // separate reason is tracked, matching the existing convention in
        // app/api/vapi-webhook/route.js, which resumes on new-billing-month
        // the same way) — a successful payment always clears the flag.
        await resumeVoiceForBilling(db, bot);

        console.log("[stripe-webhook] payment succeeded for:", bot.client_id);
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
