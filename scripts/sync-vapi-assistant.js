// scripts/sync-vapi-assistant.js
// Pushes a client's business info (same chatbots.config row the chat widget
// reads) into that client's OWN Vapi voice assistant as a phone-receptionist
// system prompt. Each client gets a dedicated Vapi assistant, tracked via
// chatbots.vapi_assistant_id — this script creates that assistant the first
// time it's synced, then patches it (prompt/greeting/tool) on every sync
// after that.
// Run: node scripts/sync-vapi-assistant.js <client_id>
//
// COST SAFETY: this script is FREE — it only ever calls Vapi's /assistant and
// /tool endpoints, which cost nothing. Phone numbers (~$2/mo each) are NOT
// provisioned here — that's a separate, manual-only script added in a later
// step. Nothing in this file calls Vapi's /phone-number API or otherwise
// creates or reserves a phone number.
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
const SAVE_BOOKING_TOOL_NAME = "save_booking";

// Defaults for a brand-new assistant, which has no "live" voice/transcriber
// to preserve yet. Matches the config the original shared assistant was
// already running (voice: Vapi's "Elliot", transcriber: Deepgram nova-3).
const DEFAULT_VOICE = { provider: "vapi", voiceId: "Elliot" };
const DEFAULT_TRANSCRIBER = { provider: "deepgram", model: "nova-3", language: "en" };

function bookingToolDefinition(webhookUrl, webhookSecret) {
  return {
    type: "function",
    function: {
      name: SAVE_BOOKING_TOOL_NAME,
      description:
        "Save a booking or message after the caller has confirmed the details out loud. Call this once, silently, right after confirmation.",
      parameters: {
        type: "object",
        properties: {
          caller_name: { type: "string", description: "The caller's full name" },
          caller_phone: { type: "string", description: "The caller's phone number" },
          service: {
            type: "string",
            description: "The service requested if booking; the reason for the call if leaving a message",
          },
          requested_time: { type: "string", description: "The requested appointment time, if booking" },
          type: {
            type: "string",
            enum: ["booking", "message"],
            description: "\"booking\" if the caller wants an appointment, \"message\" if they just want to leave a message",
          },
        },
        required: ["caller_name", "caller_phone", "type"],
      },
    },
    // Vapi's tool `server` schema has no `secret` field (it's silently
    // dropped if sent) — the x-vapi-secret header has to be set explicitly
    // via `headers`. app/api/vapi-webhook/route.js verifies it.
    server: {
      url: webhookUrl,
      headers: { "x-vapi-secret": webhookSecret },
    },
  };
}

// Finds the existing save_booking tool (by function name) and updates it, or
// creates it if this is the first sync ever. One tool resource is shared
// across every client's assistant (via toolIds) — only the assistants
// themselves are per-client.
async function ensureBookingTool(vapiHeaders, webhookUrl, webhookSecret) {
  const listResp = await fetch("https://api.vapi.ai/tool", { headers: vapiHeaders });
  if (!listResp.ok) {
    const text = await listResp.text().catch(() => "");
    throw new Error(`Vapi GET /tool returned ${listResp.status} — ${text}`);
  }
  const tools = await listResp.json();
  const existing = Array.isArray(tools)
    ? tools.find((t) => t.function?.name === SAVE_BOOKING_TOOL_NAME)
    : null;
  const definition = bookingToolDefinition(webhookUrl, webhookSecret);

  if (existing) {
    const patchResp = await fetch(`https://api.vapi.ai/tool/${existing.id}`, {
      method: "PATCH",
      headers: vapiHeaders,
      body: JSON.stringify(definition),
    });
    if (!patchResp.ok) {
      const text = await patchResp.text().catch(() => "");
      throw new Error(`Vapi PATCH /tool/${existing.id} returned ${patchResp.status} — ${text}`);
    }
    return existing.id;
  }

  const createResp = await fetch("https://api.vapi.ai/tool", {
    method: "POST",
    headers: vapiHeaders,
    body: JSON.stringify(definition),
  });
  if (!createResp.ok) {
    const text = await createResp.text().catch(() => "");
    throw new Error(`Vapi POST /tool returned ${createResp.status} — ${text}`);
  }
  const created = await createResp.json();
  return created.id;
}

// TEMPORARY — read-only lookup to find a client_id to test with. No Vapi calls.
// Run: node scripts/sync-vapi-assistant.js list
async function listChatbots() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (add them to .env.local)";
  }

  const { adminClient } = await import("../lib/supabase-admin.js");
  const db = adminClient();
  const { data: bots, error } = await db.from("chatbots").select("client_id, config, vapi_assistant_id");

  if (error) return `Supabase query error — ${error.message}`;
  if (!bots?.length) {
    console.log("No chatbots found.");
    return null;
  }

  for (const bot of bots) {
    const businessName = bot.config?.businessName || "(no businessName set)";
    const voiceStatus = bot.vapi_assistant_id
      ? `vapi_assistant_id=${bot.vapi_assistant_id}`
      : "no vapi assistant yet";
    console.log(`${bot.client_id}  ${businessName}  [${voiceStatus}]`);
  }
  return null;
}

// TEMPORARY — read-only GET on a client's assistant, no PATCH. Lets you check
// what Vapi actually has stored vs what the dashboard UI shows.
// Run: node scripts/sync-vapi-assistant.js get <client_id>
async function getAssistant(clientId) {
  const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
  if (!VAPI_PRIVATE_KEY) return "VAPI_PRIVATE_KEY is not set (add it to .env.local)";
  if (!clientId || !UUID_RE.test(clientId)) {
    return "Usage: node scripts/sync-vapi-assistant.js get <client_id>";
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (add them to .env.local)";
  }

  const { adminClient } = await import("../lib/supabase-admin.js");
  const db = adminClient();
  const { data: bot, error } = await db
    .from("chatbots")
    .select("vapi_assistant_id, config")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) return `Supabase query error — ${error.message}`;
  if (!bot) return `no chatbot found for client_id ${clientId}`;
  if (!bot.vapi_assistant_id) {
    return `client_id ${clientId} (${bot.config?.businessName ?? "?"}) has no vapi_assistant_id yet — run a sync first`;
  }

  const assistantUrl = `https://api.vapi.ai/assistant/${bot.vapi_assistant_id}`;
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

  console.log(`assistant id: ${bot.vapi_assistant_id}`);
  console.log(`businessName (Supabase): ${bot.config?.businessName ?? "?"}`);
  console.log(`firstMessage: ${assistant.firstMessage ?? "?"}`);
  console.log(`model.provider: ${assistant.model?.provider ?? "?"}`);
  console.log(`model.model: ${assistant.model?.model ?? "?"}`);
  console.log(`voice: provider=${assistant.voice?.provider ?? "?"} voiceId=${assistant.voice?.voiceId ?? "?"}`);
  console.log(`transcriber: provider=${assistant.transcriber?.provider ?? "?"} model=${assistant.transcriber?.model ?? "?"}`);
  console.log(`metadata.client_id: ${assistant.metadata?.client_id ?? "?"}`);
  return null;
}

// Returns null on success, or an error message string on failure. Never calls
// process.exit() itself — on Windows, calling process.exit() right after a
// fetch/undici network call can crash the process with a libuv assertion
// (UV_HANDLE_CLOSING) before it finishes tearing down the socket. Setting
// process.exitCode and letting main() return lets Node exit on its own.
async function run(clientId) {
  const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
  if (!VAPI_PRIVATE_KEY) return "VAPI_PRIVATE_KEY is not set (add it to .env.local)";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (add them to .env.local)";
  }
  const VAPI_WEBHOOK_URL = process.env.VAPI_WEBHOOK_URL;
  const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;
  if (!VAPI_WEBHOOK_URL) return "VAPI_WEBHOOK_URL is not set (add it to .env.local)";
  if (!VAPI_WEBHOOK_SECRET) return "VAPI_WEBHOOK_SECRET is not set (add it to .env.local)";

  // lib/ is ESM ("type": "module") so it can't be require()'d from this
  // CommonJS script — load it via dynamic import instead.
  const { adminClient } = await import("../lib/supabase-admin.js");
  const { buildVoiceSystemPrompt } = await import("../lib/voice/build-system-prompt.js");

  // Same table/columns the chat widget reads for a client (app/api/chat/route.js),
  // plus this client's own Vapi assistant id (null until the first sync).
  const db = adminClient();
  const { data: bot, error } = await db
    .from("chatbots")
    .select("config, vapi_assistant_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) return `Supabase query error — ${error.message}`;
  if (!bot?.config) return `no chatbot found for client_id ${clientId}`;

  const config = bot.config;
  const businessName = config.businessName || "this business";
  const systemPrompt = buildVoiceSystemPrompt(config);
  const firstMessage = `Thanks for calling ${businessName}! How can I help you today?`;
  const metadata = { client_id: clientId };

  const vapiHeaders = {
    Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
    "Content-Type": "application/json",
  };

  // Wires the assistant itself (not just the save_booking tool) to our
  // webhook, scoped to ONLY end-of-call-report via serverMessages — Vapi's
  // default serverMessages list also includes "tool-calls", and leaving that
  // in would mean tool-calls get delivered to us twice (once via this
  // assistant-level server, once via the tool's own server.url below),
  // risking a duplicate booking insert. app/api/vapi-webhook/route.js uses
  // end-of-call-report to track voice_minutes_used for cost control.
  const assistantServer = {
    url: VAPI_WEBHOOK_URL,
    headers: { "x-vapi-secret": VAPI_WEBHOOK_SECRET },
  };
  const assistantServerMessages = ["end-of-call-report"];

  let bookingToolId;
  try {
    bookingToolId = await ensureBookingTool(vapiHeaders, VAPI_WEBHOOK_URL, VAPI_WEBHOOK_SECRET);
  } catch (err) {
    return `failed to configure save_booking tool — ${err.message}`;
  }
  console.log(`save_booking tool id: ${bookingToolId} (server.url=${VAPI_WEBHOOK_URL})`);

  // ── No assistant yet for this client — create one from scratch ───────────
  if (!bot.vapi_assistant_id) {
    console.log(`No vapi_assistant_id on file for ${clientId} — creating a new Vapi assistant.`);

    const createBody = {
      name: `${businessName} — Voice Receptionist`,
      model: {
        provider: "anthropic",
        model: VAPI_MODEL,
        messages: [{ role: "system", content: systemPrompt }],
        toolIds: [bookingToolId],
      },
      voice: DEFAULT_VOICE,
      transcriber: DEFAULT_TRANSCRIBER,
      firstMessage,
      metadata,
      server: assistantServer,
      serverMessages: assistantServerMessages,
    };
    console.log(`POST /assistant body: ${JSON.stringify(createBody)}`);

    let createResp;
    let createText;
    try {
      createResp = await fetch("https://api.vapi.ai/assistant", {
        method: "POST",
        headers: vapiHeaders,
        body: JSON.stringify(createBody),
      });
      createText = await createResp.text().catch(() => "");
    } catch (err) {
      return `request to Vapi failed — ${err.message}`;
    }
    console.log(`POST response: ${createResp.status} ${createResp.statusText} — ${createText}`);
    if (!createResp.ok) {
      return `Vapi returned ${createResp.status} ${createResp.statusText} — ${createText}`;
    }

    const created = JSON.parse(createText);
    const newAssistantId = created.id;
    if (!newAssistantId) return "Vapi POST /assistant succeeded but returned no id";

    const { error: updateError } = await db
      .from("chatbots")
      .update({ vapi_assistant_id: newAssistantId })
      .eq("client_id", clientId);
    if (updateError) {
      return (
        `created Vapi assistant ${newAssistantId} but failed to save it to chatbots — ${updateError.message}. ` +
        `Save it to chatbots.vapi_assistant_id manually before syncing again, to avoid creating a duplicate.`
      );
    }

    console.log(
      `SUCCESS: created Vapi assistant ${newAssistantId} for "${businessName}" (client_id ${clientId}) ` +
        `and saved it to chatbots.vapi_assistant_id`
    );
    return null;
  }

  // ── This client already has a dedicated assistant — patch it in place ────
  const assistantId = bot.vapi_assistant_id;
  const assistantUrl = `https://api.vapi.ai/assistant/${assistantId}`;
  console.log(`Existing vapi_assistant_id on file for ${clientId}: ${assistantId} — updating it.`);

  // Vapi rejects a PATCH whose model object omits `provider` (it validates
  // the model as a whole, not just the fields being changed) — fetch the
  // assistant's current, live model config first and reuse it verbatim,
  // swapping out only `messages`/`model`/`toolIds`. Never hardcode a model id
  // here beyond VAPI_MODEL — voice/transcriber are left untouched entirely.
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

  const existingToolIds = Array.isArray(currentModel.toolIds) ? currentModel.toolIds : [];
  const toolIds = Array.from(new Set([...existingToolIds, bookingToolId]));
  const patchModel = {
    ...currentModel,
    model: VAPI_MODEL,
    messages: [{ role: "system", content: systemPrompt }],
    toolIds,
  };
  console.log(`Live model id was: ${currentModel.model ?? "?"}`);
  console.log(`PATCH will send — model: provider=${patchModel.provider ?? "?"} model=${patchModel.model}`);
  console.log(`PATCH will send — toolIds: ${JSON.stringify(toolIds)}`);
  console.log(`PATCH will send — firstMessage: ${firstMessage}`);
  console.log(`PATCH will send — metadata.client_id: ${clientId}`);
  console.log(`PATCH will send — server.url: ${assistantServer.url}, serverMessages: ${JSON.stringify(assistantServerMessages)}`);

  // firstMessage/metadata/server/serverMessages are top-level fields on the
  // assistant, siblings of `model` — not nested inside it.
  const patchBody = {
    model: patchModel,
    firstMessage,
    metadata,
    server: assistantServer,
    serverMessages: assistantServerMessages,
  };
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

  console.log(`SUCCESS: synced Vapi assistant ${assistantId} for "${businessName}" (client_id ${clientId})`);
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
    const err = await getAssistant(process.argv[3]).catch((e) => `unexpected error — ${e.message}`);
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
    console.error("       node scripts/sync-vapi-assistant.js get <client_id>");
    process.exitCode = 1;
    return;
  }

  const err = await run(clientId).catch((e) => `unexpected error — ${e.message}`);
  if (err) {
    console.error(`FAILED: ${err}`);
    process.exitCode = 1;
  }
}

// Exported so scripts/setup-voice.js can reuse the same create/patch-assistant
// logic instead of duplicating it. Only auto-runs main() when this file is
// executed directly (`node scripts/sync-vapi-assistant.js ...`), not when
// required as a module.
module.exports = { run };

if (require.main === module) {
  main();
}
