// scripts/scrape-test.js
// Run against the local dev server: node scripts/scrape-test.js
// Requires the dev server running on localhost:3000

"use strict";

const BASE_URL = "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 60000;
const DELAY_BETWEEN_TESTS_MS = 3000;

const TEST_CASES = [
  { industry: "dental", url: "https://www.clearchoice.com/locations/pa/pittsburgh/5500-corporate-dr/" },
  { industry: "gym", url: "https://www.fitnessfactorypgh.com/" },
  { industry: "salon", url: "https://bloombeautyparlor.com/" },
  { industry: "barber", url: "https://www.dieselbarbershop.com/location/pittsburgh-pa-lawrenceville" },
  { industry: "restaurant", url: "https://www.babyloneats.com/" },
  { industry: "law", url: "https://www.edgarsnyder.com/" },
  { industry: "lawn", url: "https://www.ajlawnpros.com/" },
  { industry: "real_estate", url: "https://www.kandsrealestate.com/" },
  { industry: "other", url: "https://www.servproofpittsburghnortheast.com" },
];

// Relevant industry boolean fields checked as a single combined field (#10)
const INDUSTRY_BOOLEAN_FIELDS = {
  dental: ["acceptingNewPatients", "hasPaymentPlans"],
  gym: ["hasFreeTrial", "hasClasses", "hasTrainers"],
  salon: ["walkInsWelcome", "hasGiftCards"],
  barber: ["walkInsWelcome", "hasBeardTrim"],
  restaurant: ["hasReservations", "hasDelivery"],
  law: ["freeConsultation", "worksOnContingency"],
  lawn: ["freeEstimates", "recurringPlans"],
  real_estate: ["acceptingClients", "isLicensed"],
  other: ["acceptingClients", "isLicensed"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function callImportWebsite(url) {
  const res = await fetch(`${BASE_URL}/api/import-website`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.extracted;
}

// Builds the ordered list of 10 checks: 9 fixed fields + 1 combined industry-boolean check.
function buildChecks(extracted, industry) {
  const checks = [];

  checks.push({
    label: "businessName",
    found: !!extracted.businessName,
    detail: extracted.businessName || "missing",
  });

  const desc = extracted.businessDescription;
  checks.push({
    label: "businessDescription",
    found: typeof desc === "string" && desc.length > 0,
    detail: typeof desc === "string" && desc.length > 0 ? `found (${desc.length} chars)` : "missing",
  });

  const services = extracted.servicesDescription;
  checks.push({
    label: "servicesDescription",
    found: typeof services === "string" && services.length > 0,
    detail: typeof services === "string" && services.length > 0 ? `found (${services.length} chars)` : "missing",
  });

  checks.push({
    label: "supportPhone",
    found: !!extracted.supportPhone,
    detail: extracted.supportPhone || "missing",
  });

  checks.push({
    label: "supportEmail",
    found: !!extracted.supportEmail,
    detail: extracted.supportEmail || "missing",
  });

  const addr = extracted.address || {};
  const addrComplete = !!(addr.street && addr.city && addr.state && addr.zip);
  checks.push({
    label: "address",
    found: addrComplete,
    detail: addrComplete
      ? `${addr.street}, ${addr.city} ${addr.state} ${addr.zip}`
      : "missing",
  });

  checks.push({
    label: "businessHours",
    found: !!extracted.businessHours,
    detail: extracted.businessHours || "missing",
  });

  checks.push({
    label: "bookingUrl",
    found: !!extracted.bookingUrl,
    detail: extracted.bookingUrl || "missing",
  });

  const knowledge = extracted.websiteKnowledge;
  const knowledgeFound = typeof knowledge === "string" && knowledge.length > 100;
  checks.push({
    label: "websiteKnowledge",
    found: knowledgeFound,
    detail: typeof knowledge === "string"
      ? `${knowledgeFound ? "found" : "too short"} (${knowledge.length} chars)`
      : "missing",
  });

  const boolFields = INDUSTRY_BOOLEAN_FIELDS[industry] || [];
  const boolResults = boolFields.map((f) => `${f}=${extracted[f] === null || extracted[f] === undefined ? "null" : extracted[f]}`);
  const anyBoolFound = boolFields.some((f) => extracted[f] !== null && extracted[f] !== undefined);
  checks.push({
    label: `industry booleans (${boolFields.join(", ")})`,
    found: anyBoolFound,
    detail: boolResults.join(", ") || "n/a",
  });

  return checks;
}

async function runTest(testCase) {
  const host = hostnameOf(testCase.url);
  console.log(`\n=== ${testCase.industry.toUpperCase()} (${host}) ===`);

  let extracted;
  try {
    extracted = await callImportWebsite(testCase.url);
  } catch (err) {
    console.log(`❌ Request failed: ${err.message}`);
    return { industry: testCase.industry, found: 0, total: 10 };
  }

  const checks = buildChecks(extracted, testCase.industry);
  let found = 0;
  for (const check of checks) {
    console.log(`${check.found ? "✅" : "❌"} ${check.label}: ${check.detail}`);
    if (check.found) found++;
  }
  console.log(`SCORE: ${found}/${checks.length} fields found`);

  return { industry: testCase.industry, found, total: checks.length };
}

async function main() {
  const results = [];
  for (let i = 0; i < TEST_CASES.length; i++) {
    const result = await runTest(TEST_CASES[i]);
    results.push(result);
    if (i < TEST_CASES.length - 1) {
      await sleep(DELAY_BETWEEN_TESTS_MS);
    }
  }

  console.log("\n=== SUMMARY ===");
  let totalFound = 0;
  let totalPossible = 0;
  for (const r of results) {
    console.log(`${r.industry}: ${r.found}/${r.total}`);
    totalFound += r.found;
    totalPossible += r.total;
  }
  console.log(`TOTAL: ${totalFound}/${totalPossible}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
