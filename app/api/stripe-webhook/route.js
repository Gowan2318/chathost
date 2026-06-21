import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clientId = session.client_reference_id;
        const stripeCustomerId = session.customer;

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

        const { error } = await db
          .from("chatbots")
          .update(updateFields)
          .eq("client_id", clientId);

        if (error) {
          console.error("[stripe-webhook] DB update failed (checkout.session.completed):", error);
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
        // sub.status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'unpaid' | 'paused' | ...
        const { error } = await db
          .from("chatbots")
          .update({ subscription_status: sub.status })
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
        const { error } = await db
          .from("chatbots")
          .update({ subscription_status: "canceled" })
          .eq("stripe_customer_id", sub.customer);

        if (error) {
          console.error("[stripe-webhook] DB update failed (subscription.deleted):", error);
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

  return NextResponse.json({ received: true });
}
