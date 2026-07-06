import { NextResponse } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
import { getClientIp, isIpBlocked, checkRateLimit, autoBlockIfAbusive } from "../../../lib/rateLimit";

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
  // Website knowledge
  "socialLinks", "promotions", "upcomingEvents", "websiteKnowledge",
]);

function applyPlanEnforcement(config, plan) {
  if (plan !== "basic") return config;
  return { ...config, ...BASIC_FIELD_DEFAULTS };
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
  strMax("Promotions", "promotions", 1000);
  strMax("Upcoming events", "upcomingEvents", 1000);
  strMax("Website knowledge", "websiteKnowledge", 2000);

  if (config.socialLinks != null) {
    if (typeof config.socialLinks !== "object" || Array.isArray(config.socialLinks)) {
      errors.push("socialLinks must be an object");
    } else {
      for (const key of ["instagram", "facebook", "tiktok"]) {
        if (config.socialLinks[key] != null && typeof config.socialLinks[key] !== "string") {
          errors.push(`socialLinks.${key} must be a string`);
        }
        if (typeof config.socialLinks[key] === "string" && config.socialLinks[key].length > 500) {
          errors.push(`socialLinks.${key} URL too long (max 500 characters)`);
        }
      }
      if (config.socialLinks.other != null) {
        if (!Array.isArray(config.socialLinks.other)) {
          errors.push("socialLinks.other must be an array");
        } else if (config.socialLinks.other.length > 10) {
          errors.push("socialLinks.other too many entries (max 10)");
        }
      }
    }
  }

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
  const clientIp = getClientIp(req);

  if (await isIpBlocked(clientIp)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(clientIp, "/api/update-chatbot", 20, 60);
  if (!allowed) {
    await autoBlockIfAbusive(clientIp);
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

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

  // Fetch the existing row: verify ownership and read the stored plan.
  const { data: chatbot, error: fetchError } = await db
    .from("chatbots")
    .select("user_id, config, plan")
    .eq("client_id", clientId)
    .maybeSingle();

  if (fetchError) {
    console.error("[update-chatbot] ownership fetch error:", fetchError);
    return NextResponse.json({ error: "Failed to verify ownership" }, { status: 500 });
  }

  if (!chatbot || chatbot.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Strip any keys not in the allow-list before further processing.
  const sanitizedConfig = Object.fromEntries(
    Object.entries(config).filter(([key]) => ALLOWED_CONFIG_KEYS.has(key))
  );

  // Use the plan and industry stored in the DB row as source of truth — clients
  // cannot upgrade their plan or change industry after initial setup via API.
  // The top-level plan column is synced by the Stripe webhook on every
  // upgrade/downgrade and takes priority over config.plan, which only
  // reflects what was chosen at signup.
  const resolvedPlan = chatbot.plan || chatbot.config?.plan || "pro";
  const existingPlan = resolvedPlan === "basic" ? "basic" : "pro";
  const existingIndustry = chatbot.config?.industry ?? sanitizedConfig.industry ?? "other";

  const configToSave = applyPlanEnforcement(
    { ...sanitizedConfig, plan: existingPlan, industry: existingIndustry },
    existingPlan
  );

  const { error } = await db
    .from("chatbots")
    .update({ config: configToSave })
    .eq("client_id", clientId);

  if (error) {
    console.error("[update-chatbot] DB error:", error);
    return NextResponse.json({ error: "Failed to save changes" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
