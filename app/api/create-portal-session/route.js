import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  const clientIp = getClientIp(req);

  if (await isIpBlocked(clientIp)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(clientIp, "/api/create-portal-session", 5, 15 * 60);
  if (!allowed) {
    await autoBlockIfAbusive(clientIp);
    return NextResponse.json({ error: "Too many requests. Please wait 15 minutes before trying again." }, { status: 429 });
  }

  // Verify caller is an authenticated Supabase user.
  // The client sends the session access_token as a Bearer token.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = adminClient();
  const { data: { user }, error: authError } = await db.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { client_id } = body;
  if (!client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(client_id)) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }

  // Fetch chatbot and confirm it belongs to the authenticated user.
  const { data: chatbot, error: dbError } = await db
    .from("chatbots")
    .select("stripe_customer_id, user_id")
    .eq("client_id", client_id)
    .single();

  if (dbError || !chatbot) {
    return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
  }

  if (chatbot.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!chatbot.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "Your subscription isn't linked yet. If you completed payment recently, please wait a moment and try again, or contact support@vestachathost.com.",
      },
      { status: 422 }
    );
  }

  // Build return URL from the request origin so it works in both dev and prod.
  const origin = req.headers.get("origin") || "https://vestachathost.com";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: chatbot.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[create-portal-session] Stripe error:", err);
    return NextResponse.json(
      { error: "Could not open subscription portal. Please try again." },
      { status: 502 }
    );
  }
}
