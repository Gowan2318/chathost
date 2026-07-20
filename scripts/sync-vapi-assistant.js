// scripts/sync-vapi-assistant.js
// Pushes a client's business info (same chatbots.config row the chat widget
// reads) into their Vapi voice assistant as a phone-receptionist system prompt.
// Run: node scripts/sync-vapi-assistant.js <client_id>
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VAPI_MODEL = "claude-sonnet-4-5-20250929"; // current working Anthropic model

// TEMPORARY — read-only lookup to find a client_id to test with. No Vapi calls.
// Run: node scripts/sync-vapi-assistant.js list
async function listChatbots() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (add them to .env.local)";
  }

  const { adminClient } = await import("../lib/supabase-admin.js");
  const db = adminClient();
  const { data: bots, error } = await db.from("chatbots").select("client_id, config");

  if (error) return `Supabase query error — ${error.message}`;
  if (!bots?.length) {
    console.log("No chatbots found.");
    return null;
  }

  for (const bot of bots) {
    const businessName = bot.config?.businessName || "(no businessName set)";
    console.log(`${bot.client_id}  ${businessName}`);
  }
  return null;
}

// TEMPORARY — read-only GET on the assistant, no PATCH. Lets you check what
// Vapi actually has stored vs what the dashboard UI shows.
// Run: node scripts/sync-vapi-assistant.js get
async function getAssistant() {
  const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
  const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
  if (!VAPI_PRIVATE_KEY) return "VAPI_PRIVATE_KEY is not set (add it to .env.local)";
  if (!VAPI_ASSISTANT_ID) return "VAPI_ASSISTANT_ID is not set (add it to .env.local)";

  const assistantUrl = `https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`;
  let assistant;
  try {
    const getResp = await fetch(assistantUrl, {
      headers: { Authorization: `Bearer ${VAPI_PRIVATE_KEY}` },
    });
    if (!getResp.ok) {
      const text = await getResp.text().catch(() => "");
      return `Vapi GET returned ${getResp.status} ${getResp.statusText} — ${text}`;
    }
    assistant = await getResp.json();
  } catch (err) {
    return `request to Vapi failed — ${err.message}`;
  }

  console.log(`firstMessage: ${assistant.firstMessage ?? "?"}`);
  console.log(`model.provider: ${assistant.model?.provider ?? "?"}`);
  console.log(`model.model: ${assistant.model?.model ?? "?"}`);
  return null;
}

// Returns null on success, or an error message string on failure. Never calls
// process.exit() itself — on Windows, calling process.exit() right after a
// fetch/undici network call can crash the process with a libuv assertion
// (UV_HANDLE_CLOSING) before it finishes tearing down the socket. Setting
// process.exitCode and letting main() return lets Node exit on its own.
async function run(clientId) {
  const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
  const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
  if (!VAPI_PRIVATE_KEY) return "VAPI_PRIVATE_KEY is not set (add it to .env.local)";
  if (!VAPI_ASSISTANT_ID) return "VAPI_ASSISTANT_ID is not set (add it to .env.local)";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (add them to .env.local)";
  }

  // lib/ is ESM ("type": "module") so it can't be require()'d from this
  // CommonJS script — load it via dynamic import instead.
  const { adminClient } = await import("../lib/supabase-admin.js");
  const { buildVoiceSystemPrompt } = await import("../lib/voice/build-system-prompt.js");

  // Same table/columns the chat widget reads for a client (app/api/chat/route.js).
  const db = adminClient();
  const { data: bot, error } = await db
    .from("chatbots")
    .select("config")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) return `Supabase query error — ${error.message}`;
  if (!bot?.config) return `no chatbot found for client_id ${clientId}`;

  const config = bot.config;
  const businessName = config.businessName || "this business";
  const systemPrompt = buildVoiceSystemPrompt(config);

  const vapiHeaders = {
    Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
    "Content-Type": "application/json",
  };
  const assistantUrl = `https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`;

  // Vapi rejects a PATCH whose model object omits `provider` (it validates
  // the model as a whole, not just the fields being changed) — fetch the
  // assistant's current, live model config first and reuse it verbatim,
  // swapping out only `messages`. Never hardcode a model id here — whatever
  // Vapi's GET returns right now is what gets echoed back on the PATCH.
  let currentModel;
  try {
    const getResp = await fetch(assistantUrl, { headers: vapiHeaders });
    if (!getResp.ok) {
      const text = await getResp.text().catch(() => "");
      return `Vapi GET returned ${getResp.status} ${getResp.statusText} — ${text}`;
    }
    const assistant = await getResp.json();
    currentModel = assistant.model;
    if (!currentModel || typeof currentModel !== "object") {
      return "Vapi GET response had no model object — refusing to PATCH without a live model to preserve";
    }

    console.log(
      `Live from Vapi — model: provider=${currentModel.provider ?? "?"} model=${currentModel.model ?? "?"}`
    );
    console.log(
      `Live from Vapi — voice: provider=${assistant.voice?.provider ?? "?"} voiceId=${assistant.voice?.voiceId ?? "?"} (untouched — not sent in PATCH)`
    );
    console.log(
      `Live from Vapi — transcriber: provider=${assistant.transcriber?.provider ?? "?"} model=${assistant.transcriber?.model ?? "?"} (untouched — not sent in PATCH)`
    );
  } catch (err) {
    return `request to Vapi failed — ${err.message}`;
  }

  // Reuse the live model object for everything (provider, temperature, etc.)
  // except `model.model` — the live value is a dead Anthropic model id that
  // 404s, so it's pinned to VAPI_MODEL instead of being echoed back verbatim.
  const patchModel = {
    ...currentModel,
    model: VAPI_MODEL,
    messages: [{ role: "system", content: systemPrompt }],
  };
  console.log(`Live model id was: ${currentModel.model ?? "?"}`);
  console.log(`PATCH will send — model: provider=${patchModel.provider ?? "?"} model=${patchModel.model}`);

  const firstMessage = `Thanks for calling ${businessName}! How can I help you today?`;
  console.log(`PATCH will send — firstMessage: ${firstMessage}`);

  // firstMessage is a top-level field on the assistant, a sibling of `model`
  // — not nested inside it — and Vapi's API spells it exactly "firstMessage".
  const patchBody = { model: patchModel, firstMessage };
  console.log(`PATCH body: ${JSON.stringify(patchBody)}`);

  let response;
  let responseText;
  try {
    response = await fetch(assistantUrl, {
      method: "PATCH",
      headers: vapiHeaders,
      body: JSON.stringify(patchBody),
    });
    responseText = await response.text().catch(() => "");
  } catch (err) {
    return `request to Vapi failed — ${err.message}`;
  }

  console.log(`PATCH response: ${response.status} ${response.statusText} — ${responseText}`);

  if (!response.ok) {
    return `Vapi returned ${response.status} ${response.statusText} — ${responseText}`;
  }

  console.log(`SUCCESS: synced Vapi assistant ${VAPI_ASSISTANT_ID} for "${businessName}" (client_id ${clientId})`);
  return null;
}

async function main() {
  const arg = process.argv[2];

  if (arg === "list") {
    const err = await listChatbots().catch((e) => `unexpected error — ${e.message}`);
    if (err) {
      console.error(`FAILED: ${err}`);
      process.exitCode = 1;
    }
    return;
  }

  if (arg === "get") {
    const err = await getAssistant().catch((e) => `unexpected error — ${e.message}`);
    if (err) {
      console.error(`FAILED: ${err}`);
      process.exitCode = 1;
    }
    return;
  }

  const clientId = arg;
  if (!clientId || !UUID_RE.test(clientId)) {
    console.error("Usage: node scripts/sync-vapi-assistant.js <client_id>");
    console.error("       node scripts/sync-vapi-assistant.js list");
    console.error("       node scripts/sync-vapi-assistant.js get");
    process.exitCode = 1;
    return;
  }

  const err = await run(clientId).catch((e) => `unexpected error — ${e.message}`);
  if (err) {
    console.error(`FAILED: ${err}`);
    process.exitCode = 1;
  }
}

main();
