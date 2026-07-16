// scripts/enrich-prospects.js
// Enriches data/prospects.csv: looks up each TODO website via Firecrawl
// search, scrapes it with Firecrawl, and fills in chat-widget/contact-email
// columns.
// Run: npm run enrich

"use strict";

const fs = require("fs");
const path = require("path");

// ── Env loader (mirrors scripts/security-test.js — standalone scripts don't
// get Next.js's automatic .env.local loading) ──────────────────────────────
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

const DRY_RUN = process.argv.includes("--dry-run");

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Dry run makes zero Firecrawl calls, so it doesn't need this key.
if (!DRY_RUN && !FIRECRAWL_API_KEY) {
  console.error("ERROR: FIRECRAWL_API_KEY is not set (add it to .env.local)");
  process.exit(1);
}

const CSV_PATH = path.resolve(__dirname, "..", "data", "prospects.csv");
const FIRECRAWL_INTERVAL_MS = 2000;

const MAX_SCRAPES = (() => {
  const n = parseInt(process.env.MAX_SCRAPES, 10);
  return Number.isFinite(n) && n > 0 ? n : 500;
})();

const COLUMNS = [
  "industry",
  "business_name",
  "address",
  "phone",
  "rating",
  "review_count",
  "owner_or_contact_name_from_public_reviews",
  "website",
  "has_chat_widget",
  "notes",
  "contact_email",
  "scrape_status",
  "scraped_at",
  "outreach_status",
  "outreach_sent_date",
  "follow_up_date",
  "reply_received",
  "outreach_notes",
];

// ── Minimal RFC4180 CSV parse/stringify (no CSV dependency in package.json) ─
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

function csvField(value) {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function stringifyCsv(rows) {
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
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

function writeRecords(records) {
  const rows = [COLUMNS, ...records.map((rec) => COLUMNS.map((c) => (rec[c] !== undefined ? rec[c] : "")))];
  fs.writeFileSync(CSV_PATH, stringifyCsv(rows), "utf8");
}

// ── Rate limiting: one Firecrawl request every two seconds ─────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
let lastFirecrawlCall = 0;
async function throttleFirecrawl() {
  const elapsed = Date.now() - lastFirecrawlCall;
  if (elapsed < FIRECRAWL_INTERVAL_MS) await sleep(FIRECRAWL_INTERVAL_MS - elapsed);
  lastFirecrawlCall = Date.now();
}

// ── Website lookup via Firecrawl search ─────────────────────────────────────
// Directory/social/aggregator domains that can rank for a business-name
// search but are never the business's own site — skipped when picking a
// result.
const EXCLUDED_WEBSITE_DOMAINS = [
  "yelp.com",
  "facebook.com",
  "yellowpages.com",
  "mapquest.com",
  "tripadvisor.com",
  "instagram.com",
  "google.com",
  "bing.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "foursquare.com",
  "bbb.org",
  "nextdoor.com",
];

function isExcludedWebsiteDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return EXCLUDED_WEBSITE_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return true; // unparsable URL — not usable as a business site
  }
}

// Finds the business's own website via Firecrawl search (no scraping — just
// the result URLs). Distinguishes "genuinely no website" from "the API call
// itself failed" so callers can tell the two apart: returns { website } on
// success (website is null when nothing usable was found), throws when the
// search request/response itself is broken so the row can be marked
// LOOKUP_FAILED and retried later instead of being poisoned as NO_WEBSITE.
async function findWebsite(businessName, address) {
  await throttleFirecrawl();
  const query = `${businessName} ${address} official website`.trim();

  let res;
  try {
    res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 5 }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new Error(`Firecrawl search request failed: ${err.message}`);
  }

  if (res.status === 429) throw new Error("Firecrawl search rate limited");
  if (!res.ok) throw new Error(`Firecrawl search HTTP ${res.status}`);

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(`Firecrawl search returned invalid JSON: ${err.message}`);
  }

  const results = (data && data.data) || [];
  const match = results.find((r) => r.url && !isExcludedWebsiteDomain(r.url));
  return { website: match ? match.url : null };
}

// ── Firecrawl scrape — same request shape as app/api/import-website/route.js
// firecrawlScrape(), extended to request rawHtml and to surface rate limits.
async function firecrawlScrape(url) {
  await throttleFirecrawl();
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown", "rawHtml"], onlyMainContent: false, waitFor: 2000 }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 429) return { status: "RATE_LIMITED" };
    if (!res.ok) return { status: "SCRAPE_FAILED" };
    const data = await res.json();
    const markdown = (data.data && data.data.markdown) || "";
    const rawHtml = (data.data && data.data.rawHtml) || "";
    if (!markdown && !rawHtml) return { status: "SCRAPE_FAILED" };
    return { status: "OK", markdown, rawHtml };
  } catch {
    return { status: "SCRAPE_FAILED" };
  }
}

// ── Hard cap on total Firecrawl calls for this run ──────────────────────────
class ScrapeCapError extends Error {}

let scrapeCount = 0;
function capAvailable() {
  return scrapeCount < MAX_SCRAPES;
}
async function scrapeWithCap(url) {
  scrapeCount++;
  return firecrawlScrape(url);
}
async function findWebsiteWithCap(businessName, address) {
  scrapeCount++;
  return findWebsite(businessName, address);
}

// ── Chat widget detection (from rawHtml) ────────────────────────────────────
const WIDGET_SIGNALS = [
  "intercom",
  "drift",
  "tidio",
  "tawk",
  "crisp",
  "livechat",
  "hubspot",
  "zendesk",
  "freshchat",
  "olark",
  "podium",
  "birdeye",
];
const WIDGET_CLASS_ID_RE = /(?:id|class)\s*=\s*["'][^"']*(chat-widget|chatbot)[^"']*["']/i;

function detectChatWidget(rawHtml) {
  if (!rawHtml) return false;
  const lower = rawHtml.toLowerCase();
  if (WIDGET_SIGNALS.some((sig) => lower.includes(sig))) return true;
  return WIDGET_CLASS_ID_RE.test(rawHtml);
}

// ── Contact email extraction (from markdown) ────────────────────────────────
const EMAIL_RE =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/;

function extractEmail(markdown) {
  if (!markdown) return null;
  const match = markdown.match(EMAIL_RE);
  return match ? match[0] : null;
}

// Finds a same-origin contact/about link in the page's markdown. Skips
// mailto: links so we never "follow" an email link to another domain.
const MD_LINK_RE = /\]\(([^)\s]+)\)/g;

function findContactOrAboutLink(markdown, baseUrl) {
  if (!markdown) return null;
  let origin;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return null;
  }
  MD_LINK_RE.lastIndex = 0;
  let match;
  while ((match = MD_LINK_RE.exec(markdown)) !== null) {
    const raw = match[1];
    if (raw.startsWith("mailto:")) continue;
    let resolved;
    try {
      resolved = new URL(raw, baseUrl);
    } catch {
      continue;
    }
    if (resolved.origin !== origin) continue;
    if (/contact|about/i.test(resolved.pathname)) return resolved.href;
  }
  return null;
}

// CSV rows are sometimes hand-entered as bare domains ("example.com") rather
// than full URLs — Firecrawl and the URL parsing below both need a scheme.
function normalizeWebsite(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// ── Row processing ──────────────────────────────────────────────────────────
// A row "needs processing" whenever scrape_status is still blank, or is
// LOOKUP_FAILED (the website search itself broke last run — retryable,
// unlike NO_WEBSITE which means the search succeeded and found nothing).
// Blank scrape_status also covers fresh TODO rows and rows a previous
// --dry-run only resolved a website for (dry run never sets scrape_status).
async function processRow(rec, counters) {
  const businessName = rec.business_name || "(unnamed)";
  const address = rec.address || "";
  const trimmedWebsite = (rec.website || "").trim();

  const needsWebsiteLookup = !trimmedWebsite || trimmedWebsite === "TODO";
  if (needsWebsiteLookup) {
    if (DRY_RUN) {
      counters.lookupPending++;
      console.log(`[${businessName}] website: needs lookup (dry run — no search)`);
      return;
    }
    if (!capAvailable()) throw new ScrapeCapError();
    let result;
    try {
      result = await findWebsiteWithCap(businessName, address);
    } catch (err) {
      rec.scrape_status = "LOOKUP_FAILED";
      rec.scraped_at = new Date().toISOString();
      console.log(`[${businessName}] website lookup failed: ${err.message}`);
      return;
    }
    rec.website = result.website || "NONE";
  } else {
    rec.website = normalizeWebsite(trimmedWebsite);
  }

  if (rec.website === "NONE") {
    counters.websiteNone++;
    console.log(`[${businessName}] website: not found`);
    if (DRY_RUN) return;
    rec.contact_email = "NONE";
    rec.scrape_status = "NO_WEBSITE";
    rec.scraped_at = new Date().toISOString();
    return;
  }

  counters.websiteFound++;
  if (DRY_RUN) {
    console.log(`[${businessName}] website: ${rec.website} (dry run — no scrape)`);
    return;
  }

  if (!capAvailable()) throw new ScrapeCapError();
  const mainScrape = await scrapeWithCap(rec.website);
  if (mainScrape.status !== "OK") {
    rec.contact_email = "NONE";
    rec.scrape_status = mainScrape.status;
    rec.scraped_at = new Date().toISOString();
    console.log(`[${businessName}] website: ${rec.website} — scrape ${mainScrape.status}`);
    return;
  }

  let hasWidget = detectChatWidget(mainScrape.rawHtml);
  let email = extractEmail(mainScrape.markdown);

  const contactUrl = findContactOrAboutLink(mainScrape.markdown, rec.website);
  if (contactUrl && capAvailable()) {
    const contactScrape = await scrapeWithCap(contactUrl);
    if (contactScrape.status === "OK") {
      if (detectChatWidget(contactScrape.rawHtml)) hasWidget = true;
      const contactEmail = extractEmail(contactScrape.markdown);
      if (contactEmail) email = contactEmail; // prefer contact/about page match
    }
  }

  rec.has_chat_widget = hasWidget ? "YES" : "NO";
  rec.contact_email = email || "NONE";
  rec.scrape_status = "OK";
  rec.scraped_at = new Date().toISOString();

  console.log(
    `[${businessName}] website: ${rec.website} — widget: ${rec.has_chat_widget} — email: ${
      rec.contact_email === "NONE" ? "not found" : "found"
    }`
  );
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: ${CSV_PATH} not found`);
    process.exit(1);
  }

  const records = readRecords();
  const needsEnrichment = (rec) => !rec.scrape_status || rec.scrape_status === "LOOKUP_FAILED";
  const pendingRows = records.filter(needsEnrichment);
  console.log(
    `${records.length} rows total, ${pendingRows.length} to enrich.${DRY_RUN ? " (dry run)" : ""}`
  );

  const counters = { websiteFound: 0, websiteNone: 0, lookupPending: 0 };
  let capHit = false;

  for (const rec of records) {
    if (!needsEnrichment(rec)) continue; // already fully enriched (or terminally failed)
    try {
      await processRow(rec, counters);
    } catch (err) {
      if (err instanceof ScrapeCapError) {
        capHit = true;
        break;
      }
      rec.scrape_status = "SCRAPE_FAILED";
      rec.scraped_at = new Date().toISOString();
      console.log(`[${rec.business_name || "(unnamed)"}] unexpected error: ${err.message}`);
    }
    // Write after every row so a crash partway through doesn't lose work.
    writeRecords(records);
  }

  writeRecords(records);

  if (capHit) {
    const remaining = records.filter(needsEnrichment).length;
    console.log(`MAX_SCRAPES cap (${MAX_SCRAPES}) reached — stopped early. ${remaining} row(s) remain unenriched.`);
  }

  if (DRY_RUN) {
    console.log(
      `Dry run summary: ${counters.websiteFound} row(s) already have a website, ${counters.websiteNone} came back NONE from prior data, ${counters.lookupPending} need a website lookup (skipped — dry run makes no Firecrawl calls).`
    );
  }

  console.log("Done.");
}

main();
