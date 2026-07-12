// scripts/discover-prospects.js
// Discovers local businesses via the Google Places Text Search API (industry x
// city combinations) and appends new, unique rows to data/prospects.csv. Run
// `npm run enrich` afterward to fill in website/chat-widget/contact-email.
// Run: npm run discover -- --confirm
// Flags: --dry-run (fetch + report, never write, skip phone lookups)
//        --confirm (skip the interactive cost confirmation prompt)

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

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  console.error("ERROR: GOOGLE_PLACES_API_KEY is not set (add it to .env.local)");
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

// Text Search returns at most 20 results per page (no pagination here), so
// this cap is really just a configurability knob for trimming that down.
const MAX_PER_SEARCH = (() => {
  const n = parseInt(process.env.MAX_PER_SEARCH, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 20;
})();

// Hard cap on total NEW businesses added this run — bounds both CSV growth
// and the worst-case Place Details (phone lookup) spend.
const MAX_TOTAL = (() => {
  const n = parseInt(process.env.MAX_TOTAL, 10);
  return Number.isFinite(n) && n > 0 ? n : 200;
})();

const SEARCH_INTERVAL_MS = 200;
const TEXT_SEARCH_COST_PER_1000 = 32; // USD
const DETAILS_COST_PER_1000 = 17; // USD

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

// ── Dedup key: normalized business name + address ───────────────────────
function dedupeKey(name, address) {
  return `${(name || "").trim().toLowerCase()}|${(address || "").trim().toLowerCase()}`;
}

// ── Google Places (Legacy) Text Search — returns up to 20 results/page ───
async function textSearch(query) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { status: `HTTP_${res.status}`, results: [] };
    const data = await res.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return { status: data.status, results: [], error: data.error_message };
    }
    return { status: data.status, results: data.results || [] };
  } catch (err) {
    return { status: "FETCH_ERROR", results: [], error: err.message };
  }
}

// ── Google Places (Legacy) Place Details — phone number only ─────────────
async function fetchPhone(placeId) {
  if (!placeId) return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "formatted_phone_number");
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.result && data.result.formatted_phone_number) || null;
  } catch {
    return null;
  }
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

async function main() {
  const existing = readRecords();
  const seen = new Set(existing.map((r) => dedupeKey(r.business_name, r.address)));

  const totalSearches = INDUSTRIES.length * CITIES.length;
  const searchCost = (totalSearches * TEXT_SEARCH_COST_PER_1000) / 1000;
  const maxPhoneCost = DRY_RUN ? 0 : (MAX_TOTAL * DETAILS_COST_PER_1000) / 1000;
  const maxTotalCost = searchCost + maxPhoneCost;

  console.log(
    `Discover prospects: ${INDUSTRIES.length} industries x ${CITIES.length} cities = ${totalSearches} Text Search requests`
  );
  console.log(
    `Estimated cost: ~$${searchCost.toFixed(2)} guaranteed (Text Search @ $${TEXT_SEARCH_COST_PER_1000}/1000)` +
      (DRY_RUN
        ? " — dry run, phone lookups (Place Details) are skipped"
        : ` + up to ~$${maxPhoneCost.toFixed(2)} for up to ${MAX_TOTAL} phone lookups (Place Details @ $${DETAILS_COST_PER_1000}/1000, only for new non-duplicate businesses) = up to ~$${maxTotalCost.toFixed(2)} total`)
  );
  console.log(
    `MAX_PER_SEARCH=${MAX_PER_SEARCH}, MAX_TOTAL new businesses=${MAX_TOTAL}${DRY_RUN ? ", DRY RUN (no CSV writes)" : ""}`
  );

  if (!AUTO_CONFIRM) {
    const ok = await confirm("This will make real, billed Google Places API calls. Proceed? (y/N): ");
    if (!ok) {
      console.log("Aborted — no API calls made.");
      return;
    }
  }

  const newRecords = [];
  let searchesRun = 0;
  let apiErrors = 0;
  let duplicatesSkipped = 0;
  let stopped = false;

  outer: for (const industry of INDUSTRIES) {
    for (const city of CITIES) {
      if (newRecords.length >= MAX_TOTAL) {
        stopped = true;
        break outer;
      }

      const query = `${industry.query} in ${city}`;
      await sleep(SEARCH_INTERVAL_MS);
      const { status, results, error } = await textSearch(query);
      searchesRun++;

      if (status !== "OK" && status !== "ZERO_RESULTS") {
        apiErrors++;
        console.log(`[${query}] search failed: ${status}${error ? ` — ${error}` : ""}`);
        continue;
      }

      console.log(`[${query}] ${results.length} result(s)`);

      const capped = results.slice(0, MAX_PER_SEARCH);
      for (const place of capped) {
        if (newRecords.length >= MAX_TOTAL) {
          stopped = true;
          break outer;
        }

        const name = place.name || "";
        const address = place.formatted_address || "";
        const key = dedupeKey(name, address);
        if (seen.has(key)) {
          duplicatesSkipped++;
          continue;
        }
        seen.add(key); // mark immediately — overlapping city searches shouldn't double-add within this run

        let phone = "";
        if (!DRY_RUN) {
          await sleep(SEARCH_INTERVAL_MS);
          phone = (await fetchPhone(place.place_id)) || "";
        }

        const rec = {
          industry: industry.key,
          business_name: name,
          address,
          phone,
          rating: place.rating != null ? String(place.rating) : "",
          review_count: place.user_ratings_total != null ? String(place.user_ratings_total) : "",
          owner_or_contact_name_from_public_reviews: "",
          website: "",
          has_chat_widget: "",
          notes: "",
          contact_email: "",
          scrape_status: "",
          scraped_at: "",
        };
        newRecords.push(rec);
        console.log(`  + ${name} — ${address}`);

        // Write after every new row so an interruption partway through a run
        // doesn't lose already-discovered businesses.
        if (!DRY_RUN) writeRecords([...existing, ...newRecords]);
      }
    }
  }

  console.log("");
  console.log(`Searches run: ${searchesRun}/${totalSearches}${apiErrors ? ` (${apiErrors} failed)` : ""}`);
  console.log(`New businesses found: ${newRecords.length}`);
  console.log(`Duplicates skipped: ${duplicatesSkipped}`);
  if (stopped) console.log(`MAX_TOTAL cap (${MAX_TOTAL}) reached — stopped early.`);

  if (DRY_RUN) {
    console.log("Dry run — nothing written to prospects.csv.");
    return;
  }

  if (newRecords.length === 0) {
    console.log("Nothing new to add.");
    return;
  }

  console.log(`Appended ${newRecords.length} new row(s) to ${CSV_PATH}`);
}

main();
