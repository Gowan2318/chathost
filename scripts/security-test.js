// scripts/security-test.js
// Run against the local dev server: node scripts/security-test.js
// Requires the dev server running on localhost:3000

"use strict";

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// ─── Config ────────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:3000";
const TEST_EMAIL = "gowanareb46+vesta3@gmail.com";
const TEST_PASSWORD = "VestaTest2026!";
const TEST_CLIENT_ID = "1c2e7dae-e44b-4864-8af5-1afe483f61cf"; // test user owns this
const FOREIGN_CLIENT_ID = "bf8a1fe8-049d-410b-a6a0-e33594a8c510"; // null user_id row; test user does NOT own it

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
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } = env;
  if (!url || !anonKey) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  console.log(`Signing in as ${TEST_EMAIL}...`);
  const supabase = createClient(url, anonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (authError || !authData?.session?.access_token) {
    console.error("ERROR: Sign-in failed:", authError?.message || "no session");
    process.exit(1);
  }
  const token = authData.session.access_token;
  console.log("Signed in successfully.\n");

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
        businessName: "Test Business",
        businessInfo: "Open Monday through Friday, 9am to 5pm.",
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

  await test("update-chatbot: foreign/null-owner client_id → 403", async () => {
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
      body: JSON.stringify({ messages, businessName: "Test", businessInfo: "Test" }),
    });
    expect(res.status, 400, "status");
  });

  await test("/api/chat: message content >2000 chars → 400", async () => {
    const res = await api("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "X".repeat(2001) }],
        businessName: "Test",
        businessInfo: "Test",
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
    // The 6th should definitely be 429 (only 5 allowed). Earlier ones may also
    // be 429 if previous test runs consumed slots within the 15-min window.
    if (!statuses.includes(429)) {
      throw new Error(`expected at least one 429 among [${statuses.join(", ")}]`);
    }
    // Extra: confirm the last response is 429 (fully exhausted)
    if (statuses[statuses.length - 1] !== 429) {
      throw new Error(`last response should be 429, got ${statuses[statuses.length - 1]}`);
    }
  });

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
