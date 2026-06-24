import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_THEMES = new Set(["light", "dark", "glass"]);

const BASIC_FIELD_DEFAULTS = {
  booking_url: "",
  payNowUrl: "",
  brandColor: "#D4AF37",
  chatTheme: "light",
  mascotName: "",
};

const ALLOWED_CONFIG_KEYS = new Set([
  "businessName", "businessInfo", "businessDescription", "servicesDescription",
  "businessHours", "address", "supportPhone", "supportEmail",
  "booking_url", "payNowUrl", "brandColor", "chatTheme",
  "quickReplies", "customQA", "mascotName", "websiteUrl",
  "industry", "plan",
  // Restaurant
  "menuUrl", "hasReservations", "reservationLink", "hasDelivery", "dietaryOptions", "priceRange",
  // Dental
  "acceptingNewPatients", "insurancePlans", "hasPaymentPlans", "newPatientFormUrl",
  // Salon / Barber / Lawncare / Other
  "walkInsWelcome", "servicesPricing",
  // Salon
  "hasGiftCards",
  // Barber
  "hasBeardTrim",
  // Gym
  "membershipUrl", "hasFreeTrial", "hasClasses", "classScheduleUrl", "hasTrainers", "equipmentInfo",
  // Law + Real estate
  "feesInfo",
  // Law
  "practiceAreas", "freeConsultation", "worksOnContingency", "caseTimeline",
  // Lawncare
  "serviceArea", "freeEstimates", "recurringPlans", "isLicensed",
  // Real estate
  "clientType", "areasServed", "listingsUrl", "acceptingClients",
  // Other
  "extraInfo", "paymentInfo",
]);

function applyPlanEnforcement(config, plan) {
  if (plan !== "basic") return config;
  return { ...config, ...BASIC_FIELD_DEFAULTS };
}

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

  if (
    !config.businessName ||
    typeof config.businessName !== "string" ||
    !config.businessName.trim()
  ) {
    errors.push("Business name is required");
  }

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
  // Industry-specific field validation
  strMax("Menu URL", "menuUrl", 500);
  strMax("Reservation link", "reservationLink", 500);
  strMax("Dietary options", "dietaryOptions", 1000);
  strMax("Price range", "priceRange", 200);
  if (Array.isArray(config.insurancePlans)) {
    if (config.insurancePlans.length > 20) {
      errors.push("Too many insurance plans (max 20)");
    }
    for (const plan of config.insurancePlans) {
      if (typeof plan === "string" && plan.length > 100) {
        errors.push("Insurance plan name too long (max 100 characters)");
        break;
      }
    }
  }
  strMax("New patient form URL", "newPatientFormUrl", 500);
  strMax("Services pricing", "servicesPricing", 1000);
  strMax("Membership URL", "membershipUrl", 500);
  strMax("Class schedule URL", "classScheduleUrl", 500);
  strMax("Equipment info", "equipmentInfo", 1000);
  strMax("Fees info", "feesInfo", 200);
  strMax("Practice areas", "practiceAreas", 1000);
  strMax("Case timeline", "caseTimeline", 200);
  strMax("Service area", "serviceArea", 1000);
  strMax("Areas served", "areasServed", 1000);
  strMax("Listings URL", "listingsUrl", 500);
  strMax("Extra info", "extraInfo", 1000);
  strMax("Payment info", "paymentInfo", 1000);

  const BOOL_FIELDS = [
    "hasReservations", "hasDelivery", "acceptingNewPatients", "hasPaymentPlans",
    "walkInsWelcome", "hasGiftCards", "hasBeardTrim",
    "hasFreeTrial", "hasClasses", "hasTrainers",
    "freeConsultation", "worksOnContingency",
    "freeEstimates", "recurringPlans", "isLicensed",
    "acceptingClients",
  ];
  for (const f of BOOL_FIELDS) {
    if (config[f] != null && typeof config[f] !== "boolean") {
      errors.push(`${f} must be a boolean`);
    }
  }

  const VALID_CLIENT_TYPES = new Set(["buyers", "sellers", "both"]);
  if (config.clientType != null && !VALID_CLIENT_TYPES.has(config.clientType)) {
    errors.push("clientType must be 'buyers', 'sellers', or 'both'");
  }

  if (config.brandColor != null && !/^#[0-9A-Fa-f]{6}$/.test(config.brandColor)) {
    errors.push("Brand color must be a valid hex color (e.g. #0D7377)");
  }

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

  const { clientId, config, plan } = body;

  if (!clientId || !UUID_RE.test(clientId)) {
    return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
  }

  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: validationErrors[0] }, { status: 400 });
  }

  // Enforce 1 chatbot per account — prevents API cost amplification abuse.
  const { count, error: countError } = await db
    .from("chatbots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError || count >= 1) {
    if (countError) console.error("[save-chatbot] count error:", countError);
    return NextResponse.json(
      { error: "Account already has a chatbot. Please manage it from your dashboard." },
      { status: 409 }
    );
  }

  const validPlan = plan === "basic" || plan === "pro" ? plan : "pro";

  // Strip any keys not in the allow-list before saving.
  const sanitizedConfig = Object.fromEntries(
    Object.entries(config).filter(([key]) => ALLOWED_CONFIG_KEYS.has(key))
  );

  const configToSave = applyPlanEnforcement({ ...sanitizedConfig, plan: validPlan }, validPlan);

  const { error } = await db.from("chatbots").insert(
    { client_id: clientId, config: configToSave, user_id: user.id }
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Chatbot ID conflict, please retry" }, { status: 409 });
    }
    console.error("[save-chatbot] insert error:", error);
    return NextResponse.json({ error: "Failed to save chatbot" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
