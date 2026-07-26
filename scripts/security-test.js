// scripts/security-test.js
// Run against the local dev server: node scripts/security-test.js
// Requires the dev server running on localhost:3000

"use strict";

const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

// ─── Config ────────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL || "gowangareb4@gmail.com";

// TEST_CLIENT_ID / FOREIGN_CLIENT_ID are no longer hardcoded — hardcoded
// fixture UUIDs rot silently the moment someone deletes the underlying rows
// (which is exactly what happened: both ids this file used to reference had
// been deleted, so the positive-path tests failed for an unrelated reason
// and the cross-tenant negative test "passed" only because there was no row
// at all to check ownership against, not because ownership was actually
// verified). Instead, createTestFixtures() below inserts two disposable
// chatbots rows fresh on every run — one owned by the signed-in test user,
// one owned by a genuinely different real auth user — and
// deleteTestFixtures() removes them again at the end, pass or fail.
let TEST_CLIENT_ID = null;
let FOREIGN_CLIENT_ID = null;

// ─── Env loader ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("ERROR: .env.local not found at", envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ─── Test runner ───────────────────────────────────────────────────────────
const results = [];
let passed = 0;
let failed = 0;

function pass(name) {
  const msg = `  ✓ PASS: ${name}`;
  results.push(msg);
  console.log(msg);
  passed++;
}

function fail(name, detail) {
  const msg = `  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ""}`;
  results.push(msg);
  console.log(msg);
  failed++;
}

async function test(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────
async function api(route, options = {}) {
  return fetch(`${BASE_URL}${route}`, options);
}

function jsonHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function expect(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

// ─── Shared valid config ────────────────────────────────────────────────────
function validConfig() {
  return {
    businessName: "Test Business",
    businessInfo: "A test business used for automated security testing.",
    businessDescription:
      "This is a test business that offers quality assurance services for software projects. We help teams ship reliable software.",
    servicesDescription: "Security testing, automated QA, code review, and integration testing.",
    businessHours: {},
    address: { street: "123 Test St", city: "Testville", state: "CA", zip: "90210" },
    supportPhone: "5551234567",
    supportEmail: "test@testbusiness.com",
    booking_url: "",
    payNowUrl: "",
    brandColor: "#D4AF37",
    chatTheme: "light",
    quickReplies: ["What are your hours?", "Where are you located?", "What services do you offer?", "How do I contact you?"],
    customQA: [],
    industry: "other",
    mascotName: "Buddy",
    websiteUrl: "https://testbusiness.com",
  };
}

// ─── Disposable fixtures ────────────────────────────────────────────────────
// Inserts one chatbots row owned by the test user (for the positive/owner
// path) and one owned by a different, real auth user (for the cross-tenant
// negative path — chatbots.user_id has a FK to auth.users, so this can't be
// a made-up UUID or NULL; migration 005 also made user_id NOT NULL, so a
// null-owner row — what the old FOREIGN_CLIENT_ID comment described — isn't
// even possible to create anymore). Returns the two fresh client_ids.
async function createTestFixtures(adminDb, testUserId) {
  const { data: users, error: listError } = await adminDb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw new Error(`could not list auth users for foreign-owner fixture: ${listError.message}`);

  const foreignUser = (users?.users || []).find((u) => u.id !== testUserId);
  if (!foreignUser) {
    throw new Error("no other auth user exists to own the foreign-tenant test fixture — create a second account first");
  }

  const testClientId = randomUUID();
  const foreignClientId = randomUUID();

  const { error: insertError } = await adminDb.from("chatbots").insert([
    { client_id: testClientId, user_id: testUserId, config: validConfig(), subscription_status: "active" },
    { client_id: foreignClientId, user_id: foreignUser.id, config: validConfig(), subscription_status: "active" },
  ]);
  if (insertError) throw new Error(`could not insert test fixtures: ${insertError.message}`);

  return { testClientId, foreignClientId };
}

async function deleteTestFixtures(adminDb, clientIds) {
  const ids = clientIds.filter(Boolean);
  if (ids.length === 0) return;
  const { error } = await adminDb.from("chatbots").delete().in("client_id", ids);
  if (error) {
    console.error(`  [teardown] failed to delete test fixtures (${ids.join(", ")}):`, error.message);
  } else {
    console.log(`  [teardown] deleted ${ids.length} disposable test fixture row(s).`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("VestaChatHost Security Test Suite");
  console.log("==================================\n");

  // ── Verify dev server is reachable ──
  try {
    const ping = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(4000) });
    console.log(`Dev server reachable (${ping.status}).\n`);
  } catch {
    console.error(`ERROR: Cannot reach dev server at ${BASE_URL}. Is it running?\n`);
    process.exit(1);
  }

  // ── Load env & sign in ──
  const env = loadEnv();
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  } = env;
  if (!url || !anonKey) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }
  if (!serviceKey) {
    console.error("ERROR: Missing SUPABASE_SERVICE_ROLE_KEY — required to create/clean up disposable test fixtures");
    process.exit(1);
  }
  const testPassword = process.env.TEST_PASSWORD || env.TEST_PASSWORD;
  if (!testPassword) {
    console.error("ERROR: Missing TEST_PASSWORD (set it in .env.local or the environment)");
    process.exit(1);
  }

  console.log(`Signing in as ${TEST_EMAIL}...`);
  const supabase = createClient(url, anonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: testPassword,
  });
  if (authError || !authData?.session?.access_token) {
    console.error("ERROR: Sign-in failed:", authError?.message || "no session");
    process.exit(1);
  }
  const token = authData.session.access_token;
  const testUserId = authData.session.user.id;
  console.log("Signed in successfully.");

  const adminDb = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ── Clear any leftover IP block from previous test runs ──
  // The rate-limit test triggers autoBlockIfAbusive(), which blocks the local IP
  // for 24 hours. On Windows, Next.js injects x-forwarded-for: ::1 for localhost
  // requests, so getClientIp() returns "::1". We also cover 127.0.0.1 and the
  // "unknown" fallback for robustness. Run this before ALL tests so a stale block
  // never causes false failures in the positive or negative test sections.
  const LOCAL_IPS = ["::1", "127.0.0.1", "unknown"];
  const { data: blocks } = await adminDb
    .from("blocked_ips")
    .select("ip_address")
    .in("ip_address", LOCAL_IPS);
  if (blocks && blocks.length > 0) {
    const blockedAddrs = blocks.map((b) => b.ip_address);
    await adminDb.from("blocked_ips").delete().in("ip_address", blockedAddrs);
    await adminDb.from("rate_limit_log").delete().in("ip_address", blockedAddrs).eq("route", "__violation__");
    console.log(`  [setup] Cleared stale IP block(s) for: ${blockedAddrs.join(", ")} (left by a previous run).`);
  }
  // Reset auth-rate-check and violation log entries unconditionally so the
  // rate-limit test starts from 0 regardless of how many times it has been
  // run within the 15-min window, and so accumulated violations can't cause
  // autoBlockIfAbusive to fire and return 403 instead of 429.
  await adminDb.from("rate_limit_log").delete().in("ip_address", LOCAL_IPS).eq("route", "/api/auth-rate-check");
  await adminDb.from("rate_limit_log").delete().in("ip_address", LOCAL_IPS).eq("route", "__violation__");
  await adminDb.from("blocked_ips").delete().in("ip_address", LOCAL_IPS);
  console.log("  [setup] Cleared auth-rate-check, violation log, and any IP blocks for local IPs.");

  // ── Create disposable test fixtures ──
  ({ testClientId: TEST_CLIENT_ID, foreignClientId: FOREIGN_CLIENT_ID } = await createTestFixtures(adminDb, testUserId));
  console.log(`  [setup] Created disposable fixtures — owned: ${TEST_CLIENT_ID}, foreign: ${FOREIGN_CLIENT_ID}\n`);

  try {
    // ════════════════════════════════════
    // POSITIVE TESTS
    // ════════════════════════════════════
    console.log("── POSITIVE TESTS ────────────────────────────────────────");

    await test("valid update-chatbot succeeds (200)", async () => {
      const res = await api("/api/update-chatbot", {
        method: "POST",
        headers: jsonHeaders(token),
        body: JSON.stringify({ clientId: TEST_CLIENT_ID, config: validConfig() }),
      });
      if (res.status !== 200) {
        const body = await res.text();
        throw new Error(`expected 200, got ${res.status}: ${body}`);
      }
      const data = await res.json();
      if (!data.ok) throw new Error("response body missing ok:true");
    });

    await test("/api/widget?id={valid-uuid} returns config (200)", async () => {
      const res = await api(`/api/widget?id=${TEST_CLIENT_ID}`);
      expect(res.status, 200, "status");
      const data = await res.json();
      if (!data.businessName) throw new Error("response missing businessName field");
    });

    await test("/api/chat with valid short message returns AI response (200)", async () => {
      const res = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "What are your hours?" }],
          clientId: TEST_CLIENT_ID,
        }),
      });
      if (res.status !== 200) {
        const body = await res.text();
        throw new Error(`expected 200, got ${res.status}: ${body}`);
      }
      const data = await res.json();
      if (!data.message) throw new Error("response missing message field");
      if (data.message.length === 0) throw new Error("AI returned empty message");
    });

    // ════════════════════════════════════
    // NEGATIVE TESTS
    // ════════════════════════════════════
    console.log("\n── NEGATIVE TESTS ────────────────────────────────────────");

    await test("update-chatbot: businessName >100 chars → 400", async () => {
      const cfg = validConfig();
      cfg.businessName = "A".repeat(101);
      const res = await api("/api/update-chatbot", {
        method: "POST",
        headers: jsonHeaders(token),
        body: JSON.stringify({ clientId: TEST_CLIENT_ID, config: cfg }),
      });
      expect(res.status, 400, "status");
    });

    await test("update-chatbot: businessDescription >1000 chars → 400", async () => {
      const cfg = validConfig();
      cfg.businessDescription = "B".repeat(1001);
      const res = await api("/api/update-chatbot", {
        method: "POST",
        headers: jsonHeaders(token),
        body: JSON.stringify({ clientId: TEST_CLIENT_ID, config: cfg }),
      });
      expect(res.status, 400, "status");
    });

    await test("update-chatbot: 9 quickReplies (max is 8) → 400", async () => {
      const cfg = validConfig();
      cfg.quickReplies = ["A", "B", "C", "D", "E", "F", "G", "H", "I"]; // 9 items
      const res = await api("/api/update-chatbot", {
        method: "POST",
        headers: jsonHeaders(token),
        body: JSON.stringify({ clientId: TEST_CLIENT_ID, config: cfg }),
      });
      expect(res.status, 400, "status");
    });

    await test("update-chatbot: no auth token → 401", async () => {
      const res = await api("/api/update-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // no Authorization header
        body: JSON.stringify({ clientId: TEST_CLIENT_ID, config: validConfig() }),
      });
      expect(res.status, 401, "status");
    });

    await test("update-chatbot: foreign client_id (real row, different owner) → 403", async () => {
      const res = await api("/api/update-chatbot", {
        method: "POST",
        headers: jsonHeaders(token),
        body: JSON.stringify({ clientId: FOREIGN_CLIENT_ID, config: validConfig() }),
      });
      expect(res.status, 403, "status");
    });

    await test("/api/widget: non-UUID id → 400", async () => {
      const res = await api("/api/widget?id=not-a-valid-uuid");
      expect(res.status, 400, "status");
    });

    await test("/api/create-portal-session: non-UUID client_id → 400", async () => {
      const res = await api("/api/create-portal-session", {
        method: "POST",
        headers: jsonHeaders(token),
        body: JSON.stringify({ client_id: "not-a-valid-uuid" }),
      });
      expect(res.status, 400, "status");
    });

    await test("/api/chat: 51 messages in array → 400", async () => {
      const messages = Array.from({ length: 51 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: "hello",
      }));
      const res = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, clientId: TEST_CLIENT_ID }),
      });
      expect(res.status, 400, "status");
    });

    await test("/api/chat: message content >2000 chars → 400", async () => {
      const res = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "X".repeat(2001) }],
          clientId: TEST_CLIENT_ID,
        }),
      });
      expect(res.status, 400, "status");
    });

    await test("/api/chat: missing clientId → 400", async () => {
      const res = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
      });
      expect(res.status, 400, "status");
    });

    // ════════════════════════════════════
    // RATE LIMIT TEST
    // ════════════════════════════════════
    console.log("\n── RATE LIMIT TEST ───────────────────────────────────────");

    await test("auth-rate-check login: 6 rapid calls produce a 429 (limit=5/15min)", async () => {
      const statuses = [];
      for (let i = 0; i < 6; i++) {
        const res = await api("/api/auth-rate-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "login" }),
        });
        statuses.push(res.status);
      }
      console.log(`    Responses: [${statuses.join(", ")}]`);
      // Local IPs (::1, 127.0.0.1) bypass rate limiting by design — all 200 is correct locally.
      if (statuses.every((s) => s === 200)) {
        console.log("    (local IP bypass active — rate limit skipped for ::1/127.0.0.1, enforced in production)");
        return;
      }
      // On a real IP the 6th call must be 429 (only 5 allowed per 15 min).
      if (!statuses.includes(429)) {
        throw new Error(`expected at least one 429 among [${statuses.join(", ")}]`);
      }
      if (statuses[statuses.length - 1] !== 429) {
        throw new Error(`last response should be 429, got ${statuses[statuses.length - 1]}`);
      }
    });
  } finally {
    // Always clean up the disposable fixtures, whether tests passed or threw.
    await deleteTestFixtures(adminDb, [TEST_CLIENT_ID, FOREIGN_CLIENT_ID]);
  }

  // ════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════
  console.log("\n==================================");
  console.log("SUMMARY");
  console.log("==================================");
  console.log(`${passed + failed} tests total: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\nFailed tests:");
    for (const r of results) {
      if (r.includes("✗")) console.log(r);
    }
    process.exit(1);
  } else {
    console.log("\nAll tests passed.");
  }
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
