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
const DEMO_LINKS = {
  salon: "https://vestachathost.com/demo/accddb1c-9739-4666-bdc9-8c5653862eeb",
  barber: "https://vestachathost.com/demo/6fc6cd3c-ccb5-4251-8db7-9768837c0e8e",
  restaurant: "https://vestachathost.com/demo/758b0eca-b4dc-4d9f-a47c-27bffd1b98fb",
  gym: "https://vestachathost.com/demo/6aa95f07-dfc3-411d-8d61-444be9425a4e",
  dental: "https://vestachathost.com/demo/47b776b5-cc31-4ec2-badd-3ad55ba43916",
  law: "https://vestachathost.com/demo/61375488-d0d8-4818-bcc9-422cb958f060",
  lawn: "https://vestachathost.com/demo/68339ada-2c15-488a-a75b-e638d12f671a",
  real_estate: "https://vestachathost.com/demo/130112eb-9c7f-4db9-9408-bbb6a36bc9ca",
};

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

function buildEmail(rec) {
  const industry = (rec.industry || "other").trim();
  const demoLink = DEMO_LINKS[industry];
  if (!demoLink) return null; // no demo to show — skip rather than send a broken link

  const business = rec.business_name || "your business";
  const industryNoun = INDUSTRY_NOUN[industry] || INDUSTRY_NOUN.other;
  const industryPlural = INDUSTRY_PLURAL[industry] || INDUSTRY_PLURAL.other;
  const greetingLine = greeting(rec.owner_or_contact_name_from_public_reviews);

  const subject = `A quick idea for ${business}'s website`;

  const body = `${greetingLine},

I came across ${business} and noticed you've built a strong presence — but I also noticed something that quietly costs a lot of local ${industryPlural} customers: people visit the website, have a question about services or pricing, and can't find the answer fast enough. So they leave.

That's where we come in. We build a custom AI assistant for your ${industryNoun} that answers your customers' questions instantly — hours, services, pricing, booking — 24 hours a day, even when you're closed. It keeps customers engaged, makes them feel taken care of, and makes your business look more professional.

Here's a live example of what we can build:
${demoLink}

Click the chat bubble and ask it anything — it's a real working demo for a ${industryNoun}. If you like what you see, we'll build one specifically for ${business} so you can test it yourself. No payment and no commitment unless you're happy with it.

We're also running a founding member discount right now — 20% off for life, but only for our first 100 customers.

Would love to hear what you think.

Best,
Gowan
VestaChatHost
vestachathost.com`;

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

  const emails = [];
  let skippedNoDemo = 0;
  for (const rec of batch) {
    const email = buildEmail(rec);
    if (!email) {
      skippedNoDemo++;
      console.log(`[skip] ${rec.business_name || "(unnamed)"} — no demo link for industry "${rec.industry}"`);
      continue;
    }
    emails.push({ rec, email });
  }

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
  if (skippedNoDemo) console.log(`Skipped (no demo link for industry): ${skippedNoDemo}`);
  console.log(`Wrote ${emails.length} email(s) to ${path.relative(process.cwd(), OUT_PATH)}`);
}

main();
