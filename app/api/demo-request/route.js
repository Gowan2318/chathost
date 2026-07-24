import { NextResponse, after } from "next/server";
import { adminClient } from "../../../lib/supabase-admin";
import { getClientIp, isIpBlocked, checkRateLimit, autoBlockIfAbusive } from "../../../lib/rateLimit";
import { sendNewDemoRequestNotification } from "../../../lib/email";

export const runtime = "nodejs";

const VALID_INDUSTRIES = new Set([
  "dental", "gym", "salon", "restaurant", "real_estate", "law", "barber", "lawn", "other",
]);

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function digitsOnly(v) {
  return String(v).replace(/\D/g, "");
}

function isValidPhone(v) {
  const d = digitsOnly(v);
  return d.length >= 10 && d.length <= 11;
}

// Mirrors save-chatbot's inline validateConfig style — dedicated server-side
// checks, independent of the client-side validators used for live UX.
function validate(body) {
  const errors = [];

  const contact_name = str(body.contact_name);
  const contact_email = str(body.contact_email).toLowerCase();
  const contact_phone = str(body.contact_phone);
  const business_name = str(body.business_name);
  const business_phone = str(body.business_phone);
  const business_website = str(body.business_website);
  const industry = str(body.industry);
  const business_description = str(body.business_description);
  const services = str(body.services);
  const hours = str(body.hours);
  const service_area = str(body.service_area);
  const notes = str(body.notes);
  const has_website = Boolean(body.has_website);

  if (!contact_name) errors.push("Your name is required.");
  else if (contact_name.length > 100) errors.push("Name is too long (max 100 characters).");

  if (!contact_email) errors.push("Your email is required.");
  else if (!isValidEmail(contact_email) || contact_email.length > 254) errors.push("Enter a valid email address.");

  if (contact_phone && !isValidPhone(contact_phone)) errors.push("Enter a valid mobile number.");

  if (!business_name) errors.push("Business name is required.");
  else if (business_name.length > 100) errors.push("Business name is too long (max 100 characters).");

  if (!business_phone) errors.push("Business phone is required.");
  else if (!isValidPhone(business_phone)) errors.push("Enter a valid business phone number.");

  if (!industry) errors.push("Industry is required.");
  else if (!VALID_INDUSTRIES.has(industry)) errors.push("Invalid industry.");

  if (!services) errors.push("Please describe the services offered.");
  else if (services.length > 1000) errors.push("Services description is too long (max 1000 characters).");

  if (!hours) errors.push("Business hours are required.");
  else if (hours.length > 500) errors.push("Hours text is too long (max 500 characters).");

  if (business_website.length > 500) errors.push("Website URL is too long.");
  if (business_description.length > 1000) errors.push("Business description is too long (max 1000 characters).");
  if (service_area.length > 500) errors.push("Service area is too long (max 500 characters).");
  if (notes.length > 2000) errors.push("Notes are too long (max 2000 characters).");

  return {
    errors,
    row: {
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      business_name,
      business_phone,
      business_website: business_website || null,
      industry,
      business_description: business_description || null,
      services,
      hours,
      service_area: service_area || null,
      has_website,
      notes: notes || null,
    },
  };
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    if (await isIpBlocked(clientIp)) {
      return json({ error: "Access denied" }, { status: 403 });
    }

    const { allowed } = await checkRateLimit(clientIp, "/api/demo-request", 5, 600);
    if (!allowed) {
      await autoBlockIfAbusive(clientIp);
      return json({ error: "Too many requests. Please wait a few minutes and try again." }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body" }, { status: 400 });
    }

    const { errors, row } = validate(body);
    if (errors.length > 0) {
      return json({ error: errors[0], errors }, { status: 400 });
    }

    const db = adminClient();
    const { data, error } = await db.from("demo_requests").insert(row).select("id").single();

    if (error) {
      console.error("[api/demo-request] insert error:", error);
      return json({ error: "Could not submit your request. Please try again." }, { status: 500 });
    }

    // sendEmail() inside lib/email.js already catches/logs internally, so
    // this can't throw and take down the (already-successful) response.
    after(() => sendNewDemoRequestNotification(row));

    return json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[api/demo-request] unhandled error:", err);
    return json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
