// scripts/discover-prospects.js
// Discovers local businesses by scraping Yelp search result pages with
// Firecrawl (industry x city combinations) and appends new, unique rows to
// data/prospects.csv. Run `npm run enrich` afterward to fill in
// website/chat-widget/contact-email.
// Run: npm run discover -- --confirm
// Flags: --dry-run (scrape just the FIRST search, print extraction, never write)
//        --confirm (skip the interactive credit-cost confirmation prompt)

"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ── Env loader (mirrors scripts/enrich-prospects.js — standalone scripts
// don't get Next.js's automatic .env.local loading) ────────────────────────
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
const AUTO_CONFIRM = process.argv.includes("--confirm");

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
if (!FIRECRAWL_API_KEY) {
  console.error("ERROR: FIRECRAWL_API_KEY is not set (add it to .env.local)");
  process.exit(1);
}

const CSV_PATH = path.resolve(__dirname, "..", "data", "prospects.csv");

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
];

const INDUSTRIES = [
  { key: "salon", query: "hair salon" },
  { key: "barber", query: "barber shop" },
  { key: "restaurant", query: "restaurant" },
  { key: "gym", query: "gym fitness center" },
  { key: "dental", query: "dentist" },
  { key: "law", query: "personal injury lawyer" },
  { key: "lawn", query: "lawn care service" },
  { key: "real_estate", query: "real estate agent" },
];

const CITIES = [
  "Pittsburgh PA",
  "Homestead PA",
  "Munhall PA",
  "West Mifflin PA",
  "McKeesport PA",
  "Squirrel Hill Pittsburgh PA",
  "Shadyside Pittsburgh PA",
  "Bethel Park PA",
  "Mount Lebanon PA",
  "Monroeville PA",
];

// Yelp search result pages generally show more listings than we want per
// city/industry combo, so this caps how many we keep from each page.
const MAX_PER_SEARCH = (() => {
  const n = parseInt(process.env.MAX_PER_SEARCH, 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
})();

// Hard cap on total NEW businesses added this run — bounds CSV growth.
const MAX_TOTAL = (() => {
  const n = parseInt(process.env.MAX_TOTAL, 10);
  return Number.isFinite(n) && n > 0 ? n : 200;
})();

const SEARCH_INTERVAL_MS = 500;
// Firecrawl doesn't publish a fixed price per scrape the way Google Places
// does — it's a credit pool with a monthly cap. This range (1-2 credits per
// scrape) is a planning estimate, not a guarantee.
const CREDITS_PER_SEARCH_MIN = 1;
const CREDITS_PER_SEARCH_MAX = 2;

// ── Minimal RFC4180 CSV parse/stringify (same as enrich-prospects.js, no CSV
// dependency in package.json) ───────────────────────────────────────────────
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
  if (!fs.existsSync(CSV_PATH)) return [];
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
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  fs.writeFileSync(CSV_PATH, stringifyCsv(rows), "utf8");
}

// ── Rate limiting ────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Dedup key: normalized business name ──────────────────────────────────
function dedupeKey(name) {
  return (name || "").trim().toLowerCase();
}

// ── Yelp search URL ────────────────────────────────────────────────────────
function buildYelpSearchUrl(query, city) {
  const url = new URL("https://www.yelp.com/search");
  url.searchParams.set("find_desc", query);
  url.searchParams.set("find_loc", city);
  return url.toString();
}

// ── Firecrawl scrape — same request shape as scripts/enrich-prospects.js
// firecrawlScrape(), markdown only (no rawHtml needed here) ─────────────────
async function firecrawlScrape(url) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false, waitFor: 2000 }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 429) return { status: "RATE_LIMITED", markdown: "" };
    if (!res.ok) return { status: `HTTP_${res.status}`, markdown: "" };
    const data = await res.json();
    const markdown = (data.data && data.data.markdown) || "";
    if (!markdown) return { status: "EMPTY", markdown: "" };
    return { status: "OK", markdown };
  } catch (err) {
    return { status: "FETCH_ERROR", markdown: "", error: err.message };
  }
}

// ── Yelp listing extraction ─────────────────────────────────────────────────
// Anchors on Yelp's business detail link pattern (/biz/slug), which stays
// stable across markdown-rendering variations, rather than trying to parse
// Yelp's visual layout (numbering, star ratings, etc. are too inconsistent
// in scraped markdown to rely on).
//
// Verified against a live scrape of a Yelp search page: search result cards
// show rating, review count, neighborhood, price range, and open/closed
// status — but never a phone number or a full street address (those only
// appear on individual business detail pages, which this script doesn't
// visit). So NEIGHBORHOOD_RE — anchored right after "(N reviews)", where
// Yelp always places the neighborhood name — is the only address-ish field
// that reliably works. PHONE_RE is kept as a defensive catch-all in case a
// listing type ever does show one inline; it's expected to stay empty for
// almost all rows.
const YELP_BIZ_LINK_RE = /\[([^\]]{2,120})\]\((https:\/\/www\.yelp\.com\/biz\/[^)\s?]+)[^)]*\)/g;
const PHONE_RE = /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
const NEIGHBORHOOD_RE = /\(\d+\s+reviews?\)\s*\n+\s*([A-Za-z][A-Za-z .'-]{1,40}?)(?=\${0,4}(?:Open|Closed)|\n|$)/i;
const NON_LISTING_NAME_RE = /^(photos?|menu|write a review|see all|more|reviews?|website|order online|directions)$/i;

function cleanListingName(raw) {
  return raw.replace(/^\*\*|\*\*$/g, "").replace(/^\d+\.\s*/, "").trim();
}

function extractYelpListings(markdown) {
  if (!markdown) return [];
  const listings = [];
  const seenSlugs = new Set();
  const matches = [...markdown.matchAll(YELP_BIZ_LINK_RE)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const name = cleanListingName(m[1]);
    if (!name || NON_LISTING_NAME_RE.test(name)) continue;

    const slugMatch = m[2].match(/\/biz\/([^/?]+)/);
    const slug = slugMatch ? slugMatch[1] : m[2];
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    // Look at the text between this link and the next one for phone/neighborhood —
    // that's where Yelp search results show contact/location details.
    const windowStart = m.index + m[0].length;
    const windowEnd = i + 1 < matches.length ? matches[i + 1].index : Math.min(markdown.length, windowStart + 600);
    const context = markdown.slice(windowStart, windowEnd);

    const phoneMatch = context.match(PHONE_RE);
    const neighborhoodMatch = context.match(NEIGHBORHOOD_RE);

    listings.push({
      name,
      phone: phoneMatch ? phoneMatch[0].trim() : "",
      address: neighborhoodMatch ? neighborhoodMatch[1].trim() : "",
    });
  }

  return listings;
}

function confirm(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

// ── Scrape + extract one industry x city combination ────────────────────────
async function runSearch(industry, city) {
  const query = `${industry.query} in ${city}`;
  const url = buildYelpSearchUrl(industry.query, city);
  const { status, markdown, error } = await firecrawlScrape(url);

  if (status !== "OK") {
    console.log(`[${query}] scrape failed: ${status}${error ? ` — ${error}` : ""} — skipping`);
    return { query, listings: [] };
  }

  const listings = extractYelpListings(markdown).slice(0, MAX_PER_SEARCH);
  if (listings.length === 0) {
    console.log(`[${query}] WARNING: 0 parseable listings (Yelp may have blocked or changed layout) — skipping`);
  } else {
    console.log(`[${query}] ${listings.length} listing(s) extracted`);
  }
  return { query, listings };
}

async function main() {
  const totalSearches = INDUSTRIES.length * CITIES.length;
  const creditsMin = totalSearches * CREDITS_PER_SEARCH_MIN;
  const creditsMax = totalSearches * CREDITS_PER_SEARCH_MAX;

  console.log(
    `Discover prospects (Yelp via Firecrawl): ${INDUSTRIES.length} industries x ${CITIES.length} cities = ${totalSearches} searches`
  );
  if (DRY_RUN) {
    console.log(
      `DRY RUN: only the first search (industry x city) will be scraped (~${CREDITS_PER_SEARCH_MIN}-${CREDITS_PER_SEARCH_MAX} Firecrawl credits), nothing written to prospects.csv`
    );
  } else {
    console.log(
      `Estimated Firecrawl credit cost: ~${creditsMin}-${creditsMax} credits (${CREDITS_PER_SEARCH_MIN}-${CREDITS_PER_SEARCH_MAX} per scrape). Firecrawl credits are a monthly pool — check your plan before proceeding.`
    );
    console.log(`MAX_PER_SEARCH=${MAX_PER_SEARCH}, MAX_TOTAL new businesses=${MAX_TOTAL}`);
  }

  if (!AUTO_CONFIRM) {
    const ok = await confirm("This will make real Firecrawl scrape requests (uses credits). Proceed? (y/N): ");
    if (!ok) {
      console.log("Aborted — no scrapes made.");
      return;
    }
  }

  // ── Dry run: scrape just the first combination and report the extraction ──
  if (DRY_RUN) {
    const industry = INDUSTRIES[0];
    const city = CITIES[0];
    const { query, listings } = await runSearch(industry, city);
    console.log("");
    console.log(`Dry run result for "${query}":`);
    if (listings.length === 0) {
      console.log("  (no listings extracted — check the raw markdown / Yelp blocking)");
    } else {
      listings.forEach((l) => {
        console.log(`  + ${l.name}${l.address ? ` — ${l.address}` : ""}${l.phone ? ` — ${l.phone}` : ""}`);
      });
    }
    console.log("Dry run — nothing written to prospects.csv.");
    return;
  }

  // ── Full run ────────────────────────────────────────────────────────────
  const existing = readRecords();
  const seen = new Set(existing.map((r) => dedupeKey(r.business_name)));

  const newRecords = [];
  let searchesRun = 0;
  let scrapeWarnings = 0;
  let duplicatesSkipped = 0;
  let stopped = false;

  outer: for (const industry of INDUSTRIES) {
    for (const city of CITIES) {
      if (newRecords.length >= MAX_TOTAL) {
        stopped = true;
        break outer;
      }

      await sleep(SEARCH_INTERVAL_MS);
      const { listings } = await runSearch(industry, city);
      searchesRun++;
      if (listings.length === 0) scrapeWarnings++;

      for (const listing of listings) {
        if (newRecords.length >= MAX_TOTAL) {
          stopped = true;
          break outer;
        }

        const key = dedupeKey(listing.name);
        if (seen.has(key)) {
          duplicatesSkipped++;
          continue;
        }
        seen.add(key); // mark immediately — overlapping city searches shouldn't double-add within this run

        const rec = {
          industry: industry.key,
          business_name: listing.name,
          address: listing.address,
          phone: listing.phone,
          rating: "",
          review_count: "",
          owner_or_contact_name_from_public_reviews: "",
          website: "",
          has_chat_widget: "",
          notes: "",
          contact_email: "",
          scrape_status: "",
          scraped_at: "",
        };
        newRecords.push(rec);
        console.log(`  + ${listing.name}${listing.address ? ` — ${listing.address}` : ""}`);

        // Write after every new row so an interruption partway through a run
        // doesn't lose already-discovered businesses.
        writeRecords([...existing, ...newRecords]);
      }
    }
  }

  console.log("");
  console.log(`Searches run: ${searchesRun}/${totalSearches}${scrapeWarnings ? ` (${scrapeWarnings} returned no listings)` : ""}`);
  console.log(`New businesses found: ${newRecords.length}`);
  console.log(`Duplicates skipped: ${duplicatesSkipped}`);
  if (stopped) console.log(`MAX_TOTAL cap (${MAX_TOTAL}) reached — stopped early.`);

  if (newRecords.length === 0) {
    console.log("Nothing new to add.");
    return;
  }

  console.log(`Appended ${newRecords.length} new row(s) to ${CSV_PATH}`);
}

main();
