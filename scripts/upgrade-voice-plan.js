// scripts/upgrade-voice-plan.js
// White-glove voice plan change: sets a client's voice_plan + the matching
// voice_minutes_limit (from lib/plans.js), clears voice_paused, and
// re-enables their Vapi assistant if it had been auto-paused. Run this after
// a client has paid for an upgrade — no client-facing UI, this is founder-run.
// Usage: node scripts/upgrade-voice-plan.js --client <client_id> --plan <starter|growth|pro>
//
// COST SAFETY: free — only PATCHes chatbots (Supabase) and the client's
// existing Vapi assistant/phone-number resources. Never creates a phone
// number (that's scripts/setup-voice.js, manual/--confirm only).
"use strict";

const fs = require("fs");
const path = require("path");

// Env loader (mirrors scripts/sync-vapi-assistant.js) — standalone scripts
// don't get Next.js's automatic .env.local loading.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs(argv) {
  let client = null;
  let plan = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--client") {
      client = argv[i + 1] ?? null;
      i++;
    } else if (argv[i] === "--plan") {
      plan = argv[i + 1] ?? null;
      i++;
    }
  }
  return { client, plan };
}

// Returns null on success, or an error message string on failure — same
// convention as sync-vapi-assistant.js's run(). Never calls process.exit()
// itself, for the same Windows/libuv reason documented there.
async function run(clientId, plan) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (add them to .env.local)";
  }

  const { adminClient } = await import("../lib/supabase-admin.js");
  const { isValidVoicePlan, voiceMinutesLimitFor, VOICE_PLAN_IDS } = await import("../lib/plans.js");
  const { resumeVapiAssistant } = await import("../lib/vapi-control.js");

  if (!isValidVoicePlan(plan)) {
    return `Invalid plan "${plan}" — must be one of: ${VOICE_PLAN_IDS.join(", ")}`;
  }
  const newLimit = voiceMinutesLimitFor(plan);

  const db = adminClient();
  const { data: bot, error: fetchError } = await db
    .from("chatbots")
    .select(
      "client_id, config, vapi_assistant_id, vapi_phone_number, voice_plan, voice_paused, voice_minutes_used, voice_minutes_limit"
    )
    .eq("client_id", clientId)
    .maybeSingle();
  if (fetchError) return `Supabase query error — ${fetchError.message}`;
  if (!bot) return `no chatbot found for client_id ${clientId}`;

  const businessName = bot.config?.businessName || "this business";
  console.log(`── Upgrading voice plan for ${clientId} (${businessName}) ──`);
  console.log(
    `Current: plan=${bot.voice_plan ?? "(none)"} limit=${bot.voice_minutes_limit ?? "(none)"} ` +
      `used=${bot.voice_minutes_used ?? 0} paused=${bot.voice_paused}`
  );
  console.log(`New:     plan=${plan} limit=${newLimit} paused=false`);

  const { error: updateError } = await db
    .from("chatbots")
    .update({ voice_plan: plan, voice_minutes_limit: newLimit, voice_paused: false })
    .eq("client_id", clientId);
  if (updateError) return `Supabase update error — ${updateError.message}`;

  console.log("Supabase updated. Re-enabling Vapi assistant (if it was disabled)...");
  const summary = await resumeVapiAssistant({
    clientId,
    assistantId: bot.vapi_assistant_id,
    phoneNumber: bot.vapi_phone_number,
  });
  console.log("resumeVapiAssistant summary:", JSON.stringify(summary, null, 2));

  if (summary.errors.length > 0) {
    console.warn(
      "WARNING: voice_plan/voice_minutes_limit/voice_paused were updated in Supabase, but re-enabling in " +
        "Vapi hit issue(s) above — check manually before assuming the client's line is live again."
    );
  }

  console.log(`SUCCESS: ${clientId} (${businessName}) is now on the ${plan} plan (${newLimit} min/mo), unpaused.`);
  return null;
}

async function main() {
  const { client: clientId, plan } = parseArgs(process.argv.slice(2));
  if (!clientId || !UUID_RE.test(clientId) || !plan) {
    console.error("Usage: node scripts/upgrade-voice-plan.js --client <client_id> --plan <starter|growth|pro>");
    process.exitCode = 1;
    return;
  }

  const err = await run(clientId, plan).catch((e) => `unexpected error — ${e.message}`);
  if (err) {
    console.error(`FAILED: ${err}`);
    process.exitCode = 1;
  }
}

main();
