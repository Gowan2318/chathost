import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_THEMES = new Set(["light", "dark", "glass"]);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return ["Invalid config object"];
  }

  const errors = [];

  const strMax = (label, key, max) => {
    const val = config[key];
    if (typeof val === "string" && val.length > max) {
      errors.push(`${label} exceeds maximum length of ${max} characters`);
    }
  };

  strMax("Business name", "businessName", 100);
  strMax("Business info", "businessInfo", 3000);
  strMax("Business description", "businessDescription", 1000);
  strMax("Services description", "servicesDescription", 500);
  strMax("Support phone", "supportPhone", 30);
  strMax("Support email", "supportEmail", 254);
  strMax("Booking URL", "booking_url", 500);
  strMax("Payment URL", "payNowUrl", 500);
  strMax("Website URL", "websiteUrl", 500);
  strMax("Brand color", "brandColor", 7);
  strMax("Mascot name", "mascotName", 20);

  if (config.chatTheme != null && !ALLOWED_THEMES.has(config.chatTheme)) {
    errors.push("Invalid chat theme");
  }

  if (Array.isArray(config.quickReplies)) {
    if (config.quickReplies.length > 8) {
      errors.push("Too many quick replies (max 8)");
    }
    for (const r of config.quickReplies) {
      if (typeof r === "string" && r.length > 80) {
        errors.push("Quick reply text too long (max 80 characters)");
        break;
      }
    }
  }

  if (Array.isArray(config.customQA)) {
    if (config.customQA.length > 20) {
      errors.push("Too many custom Q&A pairs (max 20)");
    }
    for (const qa of config.customQA) {
      if (qa?.question != null && String(qa.question).length > 200) {
        errors.push("Custom Q&A question too long (max 200 characters)");
        break;
      }
      if (qa?.answer != null && String(qa.answer).length > 1000) {
        errors.push("Custom Q&A answer too long (max 1000 characters)");
        break;
      }
    }
  }

  const addr = config.address;
  if (addr != null && typeof addr === "object" && !Array.isArray(addr)) {
    if (typeof addr.street === "string" && addr.street.length > 200)
      errors.push("Street address too long (max 200 characters)");
    if (typeof addr.city === "string" && addr.city.length > 100)
      errors.push("City too long (max 100 characters)");
    if (typeof addr.state === "string" && addr.state.length > 5)
      errors.push("State value too long");
    if (typeof addr.zip === "string" && addr.zip.length > 10)
      errors.push("ZIP code too long");
  }

  return errors;
}

export async function POST(req) {
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

  const { clientId, config } = body;

  if (!clientId || !UUID_RE.test(clientId)) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
  }

  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: validationErrors[0] }, { status: 400 });
  }

  // Verify the chatbot belongs to the authenticated user before updating.
  const { data: chatbot } = await db
    .from("chatbots")
    .select("user_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!chatbot || chatbot.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await db
    .from("chatbots")
    .update({ config })
    .eq("client_id", clientId);

  if (error) {
    console.error("[update-chatbot] DB error:", error);
    return NextResponse.json({ error: "Failed to save changes" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
