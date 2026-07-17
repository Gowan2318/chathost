// scripts/follow-ups.js
// Reports which outreach prospects are due for a follow-up. Read-only —
// never sends anything and never modifies prospects.csv.
// Run: npm run followups

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

// ── Date helpers ─────────────────────────────────────────────────────────
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateOnly(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function daysBetween(from, to) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// ── Eligibility ──────────────────────────────────────────────────────────
function isDueForFollowUp(rec, today) {
  const status = (rec.outreach_status || "").trim().toLowerCase();
  if (status !== "sent") return false;

  const replied = (rec.reply_received || "").trim().toLowerCase();
  if (replied === "yes") return false;

  const followUpDate = parseDateOnly(rec.follow_up_date);
  if (!followUpDate) return false;

  return followUpDate.getTime() <= today.getTime();
}

// ── Main ─────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: ${CSV_PATH} not found`);
    process.exit(1);
  }

  const today = startOfDay(new Date());
  const records = readRecords();
  const due = records.filter((rec) => isDueForFollowUp(rec, today));

  const byIndustry = {};
  for (const rec of due) {
    const ind = rec.industry || "(unknown)";
    (byIndustry[ind] = byIndustry[ind] || []).push(rec);
  }

  if (due.length === 0) {
    console.log("No prospects are due for a follow-up today.");
    return;
  }

  console.log(`${due.length} prospect(s) due for follow-up:\n`);

  Object.entries(byIndustry)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([industry, rows]) => {
      console.log(`── ${industry} (${rows.length}) ──`);
      rows.forEach((rec) => {
        const sentDate = parseDateOnly(rec.outreach_sent_date);
        const daysSince = sentDate ? daysBetween(sentDate, today) : "?";
        console.log(
          `  ${rec.business_name || "(unnamed)"} | ${rec.contact_email || "(no email)"} | sent: ${
            rec.outreach_sent_date || "(unknown)"
          } | days since sent: ${daysSince}`
        );
      });
      console.log("");
    });

  console.log("── Summary ──");
  console.log(`Total due for follow-up: ${due.length}`);
  Object.entries(byIndustry)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([industry, rows]) => console.log(`  ${industry}: ${rows.length}`));
}

main();
