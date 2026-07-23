// scripts/setup-voice.js
// Provisions a client's Vapi phone number and attaches it to their assistant.
// Usage: node scripts/setup-voice.js --client <client_id> [--confirm]
"use strict";

// Requiring sync-vapi-assistant.js also runs its env loader (loadEnv()) as a
// side effect, and reuses its create/patch-assistant logic — see the
// module.exports guard at the bottom of that file.
const { run: ensureAssistantSynced } = require("./sync-vapi-assistant.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// COST SAFETY: this is the ONLY script in this project that provisions Vapi
// phone numbers, and each one costs ~$2/mo the moment it's created — that
// billing starts immediately on a successful POST, not when a call first
// comes in. This script defaults to a dry run that makes zero calls to
// Vapi's /phone-number endpoint; it only actually provisions when passed
// --confirm. Never wire this into any automated flow (signup, cron, etc.) —
// it must stay manual-only, run by a human for a client who has actually
// paid.
const PHONE_NUMBER_MONTHLY_COST = "~$2/month";

function parseArgs(argv) {
  let client = null;
  let confirm = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--client") {
      client = argv[i + 1] ?? null;
      i++;
    } else if (argv[i] === "--confirm") {
      confirm = true;
    }
  }
  return { client, confirm };
}

// Returns null on success, or an error message string on failure — same
// convention as sync-vapi-assistant.js's run(). Never calls process.exit()
// itself, for the same Windows/libuv reason documented there.
async function run(clientId, confirm) {
  const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
  if (!VAPI_PRIVATE_KEY) return "VAPI_PRIVATE_KEY is not set (add it to .env.local)";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (add them to .env.local)";
  }

  const { adminClient } = await import("../lib/supabase-admin.js");
  const db = adminClient();

  const { data: bot, error: fetchError } = await db
    .from("chatbots")
    .select("client_id, config, vapi_assistant_id, vapi_phone_number")
    .eq("client_id", clientId)
    .maybeSingle();
  if (fetchError) return `Supabase query error — ${fetchError.message}`;
  if (!bot) return `no chatbot found for client_id ${clientId}`;

  const businessName = bot.config?.businessName || "this business";

  // ── Idempotency guard — a client only ever gets one number ───────────────
  // Checked first, before touching the assistant or previewing anything: if
  // a number is already on file there is nothing to do, provision, or preview.
  if (bot.vapi_phone_number) {
    console.log(
      `${clientId} (${businessName}) already has a Vapi phone number: ${bot.vapi_phone_number} — not provisioning another.`
    );
    return null;
  }

  console.log(`── Ensuring Vapi assistant for ${clientId} (${businessName}) ──`);
  const assistantError = await ensureAssistantSynced(clientId);
  if (assistantError) return `could not ensure assistant — ${assistantError}`;

  const { data: refetched, error: refetchError } = await db
    .from("chatbots")
    .select("vapi_assistant_id")
    .eq("client_id", clientId)
    .maybeSingle();
  if (refetchError) return `Supabase query error re-reading vapi_assistant_id — ${refetchError.message}`;
  const assistantId = refetched?.vapi_assistant_id;
  if (!assistantId) return "assistant sync reported success but chatbots.vapi_assistant_id is still empty";

  const phoneNumberName = `${businessName} — Main Line`;
  const createBody = { provider: "vapi", assistantId, name: phoneNumberName };

  console.log(`\n── Phone number provisioning for ${clientId} (${businessName}) ──`);
  console.log(`Assistant to attach to: ${assistantId}`);
  console.log(`Would POST https://api.vapi.ai/phone-number with body: ${JSON.stringify(createBody)}`);

  if (!confirm) {
    console.log("\nDRY RUN — no phone number was created, and no request was sent to Vapi's /phone-number endpoint.");
    console.log(`COST IF CONFIRMED: a new Vapi phone number costs ${PHONE_NUMBER_MONTHLY_COST}, billed starting immediately on creation.`);
    console.log("Re-run with --confirm to actually provision and attach the number.");
    return null;
  }

  console.log("\nPROVISIONING — creating a real Vapi phone number now. This starts billing immediately.");
  let createResp;
  let createText;
  try {
    createResp = await fetch("https://api.vapi.ai/phone-number", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
    createText = await createResp.text().catch(() => "");
  } catch (err) {
    return `request to Vapi failed — ${err.message}`;
  }
  console.log(`POST response: ${createResp.status} ${createResp.statusText} — ${createText}`);
  if (!createResp.ok) return `Vapi returned ${createResp.status} ${createResp.statusText} — ${createText}`;

  const created = JSON.parse(createText);
  const number = created.number;
  if (!number) return "Vapi POST /phone-number succeeded but returned no `number` in the response";

  const { error: updateError } = await db
    .from("chatbots")
    .update({ vapi_phone_number: number })
    .eq("client_id", clientId);
  if (updateError) {
    return (
      `provisioned Vapi phone number ${number} (id ${created.id}) but failed to save it to chatbots — ${updateError.message}. ` +
      `Save it to chatbots.vapi_phone_number manually — do NOT run this script again for this client, it would provision a duplicate number.`
    );
  }

  console.log(
    `SUCCESS: provisioned Vapi phone number ${number} (id ${created.id}, status ${created.status ?? "?"}) ` +
      `for "${businessName}" (client_id ${clientId}) and saved it to chatbots.vapi_phone_number`
  );
  return null;
}

async function main() {
  const { client: clientId, confirm } = parseArgs(process.argv.slice(2));
  if (!clientId || !UUID_RE.test(clientId)) {
    console.error("Usage: node scripts/setup-voice.js --client <client_id> [--confirm]");
    process.exitCode = 1;
    return;
  }

  const err = await run(clientId, confirm).catch((e) => `unexpected error — ${e.message}`);
  if (err) {
    console.error(`FAILED: ${err}`);
    process.exitCode = 1;
  }
}

main();
