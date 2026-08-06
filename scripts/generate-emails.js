// scripts/generate-emails.js
// Generates personalized outreach emails from data/prospects.csv so they can
// be copy-pasted into Gmail. Read-only — never sends anything and never
// modifies prospects.csv.
// Run: npm run emails -- --industry gym --limit 10

"use strict";

const fs = require("fs");
const path = require("path");

// ── Env loader (mirrors scripts/enrich-prospects.js — standalone scripts
// don't get Next.js's automatic .env.local loading) ─────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const CSV_PATH = path.resolve(__dirname, "..", "data", "prospects.csv");
const OUT_PATH = path.resolve(__dirname, "..", "data", "generated-emails.txt");

// ── Minimal RFC4180 CSV parse (mirrors scripts/enrich-prospects.js) ─────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function readRecords() {
  const text = fs.readFileSync(CSV_PATH, "utf8");
  const table = parseCsv(text);
  const header = table[0] || [];
  return table.slice(1).map((r) => {
    const rec = {};
    header.forEach((h, idx) => {
      rec[h] = r[idx] !== undefined ? r[idx] : "";
    });
    return rec;
  });
}

// ── CLI args ─────────────────────────────────────────────────────────────
function getFlagValue(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const industryFilter = getFlagValue("industry", null);
const limit = (() => {
  const n = parseInt(getFlagValue("limit", "5"), 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
})();

// ── Reference data ───────────────────────────────────────────────────────
const INDUSTRY_NOUN = {
  salon: "salon",
  barber: "barber shop",
  restaurant: "restaurant",
  gym: "gym",
  dental: "dental practice",
  law: "law firm",
  lawn: "lawn care business",
  real_estate: "real estate business",
  other: "business",
};

const INDUSTRY_PLURAL = {
  salon: "salons",
  barber: "barber shops",
  restaurant: "restaurants",
  gym: "gyms",
  dental: "dental practices",
  law: "law firms",
  lawn: "lawn care businesses",
  real_estate: "real estate businesses",
  other: "businesses",
};

// What's usually happening when a call to this kind of business goes
// unanswered — used to make the pain point feel specific to their day, not
// like a generic mail-merge line.
const BUSY_MOMENT = {
  salon: "with a client in the chair",
  barber: "mid-cut",
  restaurant: "slammed during a rush",
  gym: "in the middle of training someone",
  dental: "with a patient in the chair",
  law: "in with a client",
  lawn: "out on a job site",
  real_estate: "out showing a property",
  other: "with a customer",
};

// ── Eligibility ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
function isValidEmail(v) {
  const trimmed = (v || "").trim();
  return trimmed && trimmed.toUpperCase() !== "NONE" && EMAIL_RE.test(trimmed);
}

function isNotSent(v) {
  const status = (v || "").trim().toLowerCase();
  return status === "" || status === "not_sent";
}

function isEligible(rec) {
  return (
    (rec.has_chat_widget || "").trim().toUpperCase() === "NO" &&
    isValidEmail(rec.contact_email) &&
    isNotSent(rec.outreach_status)
  );
}

// ── Email content ────────────────────────────────────────────────────────
function greeting(ownerName) {
  const trimmed = (ownerName || "").trim();
  if (!trimmed) return "Hi there";
  const firstName = trimmed.split(/\s+/)[0];
  return `Hi ${firstName}`;
}

// Address data is inconsistent — a bare neighborhood ("Mount Lebanon"), a
// "City ST" or "City ST 12345" with no comma at all ("Pittsburgh PA",
// "Glenshaw PA 15116"), or a full street address ("879 Forest Ave, West
// Homestead PA 15120"). Pull out something nameable to reference, or null
// if there's nothing clean to say.
function cityFromAddress(address) {
  const trimmed = (address || "").trim();
  if (!trimmed) return null;

  const afterComma = trimmed.includes(",") ? trimmed.split(",").pop().trim() : trimmed;
  const stripped = afterComma.replace(/\s+[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/, "").trim();
  return stripped || afterComma || null;
}

// The opener has to read like we actually looked at them, not a mail merge.
// Prefer their real rating/review count (concrete, true, flattering) over a
// generic city reference, and fall back further if neither is available.
function personalizedObservation(rec, industryNoun, industryPlural, city) {
  const rating = parseFloat(rec.rating);
  const reviewCount = parseInt(rec.review_count, 10);
  if (Number.isFinite(rating) && rating > 0 && Number.isFinite(reviewCount) && reviewCount > 0) {
    return `noticed you've got a ${rating.toFixed(1)}★ rating across ${reviewCount} reviews — that doesn't happen by accident`;
  }
  if (city) {
    return `noticed you're one of the ${industryPlural} keeping ${city} running`;
  }
  return `noticed you run a solid, well-established ${industryNoun}`;
}

function buildEmail(rec) {
  const industry = (rec.industry || "other").trim();
  const business = rec.business_name || "your business";
  const industryNoun = INDUSTRY_NOUN[industry] || INDUSTRY_NOUN.other;
  const industryPlural = INDUSTRY_PLURAL[industry] || INDUSTRY_PLURAL.other;
  const busyMoment = BUSY_MOMENT[industry] || BUSY_MOMENT.other;
  const city = cityFromAddress(rec.address);
  const greetingLine = greeting(rec.owner_or_contact_name_from_public_reviews);
  const observation = personalizedObservation(rec, industryNoun, industryPlural, city);

  const subject = `A quick solution for ${business}`;

  const body = `${greetingLine},

I came across ${business} and ${observation}.

Here's the thing that quietly costs ${industryPlural} customers: when the phone rings while you're ${busyMoment} and nobody picks up, that caller doesn't leave a voicemail — they just hang up and call the next ${industryNoun} on Google.

We set up an AI voice receptionist that answers your calls, catches every caller's name and what they need, and can answer questions about your services using info straight from your own website — a free chat widget for your site is included too.

It's a small thing that ends up being a real edge over other ${industryPlural} in the area who are still missing those calls.

Want me to build you a free demo? No commitment — you hear it answer as your business, then decide. The decision's completely yours.

— Gowan, VestaChatHost
hello@vestachathost.com | vestachathost.com`;

  return { to: rec.contact_email, subject, body };
}

// ── Main ─────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: ${CSV_PATH} not found`);
    process.exit(1);
  }

  const records = readRecords();
  let candidates = records.filter(isEligible);

  if (industryFilter) {
    candidates = candidates.filter(
      (rec) => (rec.industry || "").trim().toLowerCase() === industryFilter.trim().toLowerCase()
    );
  }

  const batch = candidates.slice(0, limit);
  const emails = batch.map((rec) => ({ rec, email: buildEmail(rec) }));

  const fileLines = [];
  for (const { rec, email } of emails) {
    const block = [
      "=".repeat(70),
      `TO: ${email.to}`,
      `SUBJECT: ${email.subject}`,
      "BODY:",
      email.body,
      "=".repeat(70),
      "",
    ].join("\n");
    console.log(block);
    fileLines.push(block);
  }

  fs.writeFileSync(OUT_PATH, fileLines.join("\n"), "utf8");

  const byIndustry = {};
  for (const { rec } of emails) {
    const ind = rec.industry || "(unknown)";
    byIndustry[ind] = (byIndustry[ind] || 0) + 1;
  }

  console.log("── Summary ──");
  console.log(`Generated: ${emails.length}${industryFilter ? ` (industry: ${industryFilter})` : ""}`);
  Object.entries(byIndustry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ind, count]) => console.log(`  ${ind}: ${count}`));
  console.log(`Wrote ${emails.length} email(s) to ${path.relative(process.cwd(), OUT_PATH)}`);
}

main();
