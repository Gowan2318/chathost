// Disables/re-enables a client's Vapi voice assistant so it stops/resumes
// answering real phone calls when they hit their voice-minute cap.
//
// MECHANISM (confirmed against Vapi's live OpenAPI spec at
// https://api.vapi.ai/api-json on 2026-07-24 — grepped every schema in it for
// enable/disable/active/pause/suspend/block-style booleans; none apply to
// Assistant or PhoneNumber). Vapi has no assistant-level enabled/disabled
// flag. The only documented mechanism for stopping an assistant from
// answering real calls is detaching it from the phone number that routes to
// it — per docs.vapi.ai/api-reference/phone-numbers/update
// (UpdateVapiPhoneNumberDTO.assistantId): "If neither assistantId, squadId
// nor workflowId is set... the inbound call is hung up with an error
// message" (when no fallbackDestination is set). So: clear
// phoneNumber.assistantId to disable, restore it to re-enable.
//
// We also stamp the assistant's own `metadata` (a documented free-form
// object field, already used elsewhere for metadata.client_id) with a
// voicePaused flag + timestamp. This does NOT itself stop calls — it's an
// audit trail, visible via GET /assistant and in Vapi's dashboard, and it's
// the one part of this that's verifiable for a client with no phone number
// yet.
//
// CAVEAT: as of this writing NO client has an actual Vapi phone number
// provisioned (cost-safety policy — phone numbers are manual/paid, see
// scripts/setup-voice.js), so the phoneNumber.assistantId-clearing path has
// never been exercised against a real Vapi phone number resource. The
// lookup below correctly finds zero matches and no-ops for every client
// today. The exact accepted-value semantics of clearing assistantId (we
// send `null`, the REST-conventional way to unset an optional field — the
// OpenAPI schema types it as plain `string` with no documented null case)
// should be spot-checked the first time a real client with a phone number
// is paused.

const VAPI_BASE = "https://api.vapi.ai";

function vapiHeaders() {
  return {
    Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function findPhoneNumberResource(number) {
  if (!number) return null;
  const res = await fetch(`${VAPI_BASE}/phone-number`, { headers: vapiHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vapi GET /phone-number returned ${res.status} — ${text}`);
  }
  const numbers = await res.json();
  if (!Array.isArray(numbers)) return null;
  return numbers.find((n) => n.number === number) || null;
}

async function patchAssistantMetadata(assistantId, clientId, extra) {
  const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method: "PATCH",
    headers: vapiHeaders(),
    body: JSON.stringify({ metadata: { client_id: clientId, ...extra } }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vapi PATCH /assistant/${assistantId} returned ${res.status} — ${text}`);
  }
}

/**
 * Disables a client's Vapi assistant: detaches it from its phone number (if
 * one exists) and stamps its metadata as paused. Never throws — returns a
 * summary object for logging. A Vapi-side failure here must not block the
 * caller from still recording voice_paused=true in our own DB, since that's
 * the source of truth the rest of the app (admin dashboard, resume script)
 * reads from.
 */
export async function pauseVapiAssistant({ clientId, assistantId, phoneNumber }) {
  const summary = {
    assistantId,
    phoneNumberFound: false,
    phoneNumberDetached: false,
    metadataStamped: false,
    errors: [],
  };
  if (!assistantId) {
    summary.errors.push("no vapi_assistant_id on file — nothing to disable");
    return summary;
  }
  if (!process.env.VAPI_PRIVATE_KEY) {
    summary.errors.push("VAPI_PRIVATE_KEY is not set");
    return summary;
  }

  if (phoneNumber) {
    try {
      const resource = await findPhoneNumberResource(phoneNumber);
      if (resource) {
        summary.phoneNumberFound = true;
        const patchRes = await fetch(`${VAPI_BASE}/phone-number/${resource.id}`, {
          method: "PATCH",
          headers: vapiHeaders(),
          body: JSON.stringify({ provider: "vapi", assistantId: null }),
        });
        if (!patchRes.ok) {
          const text = await patchRes.text().catch(() => "");
          summary.errors.push(`Vapi PATCH /phone-number/${resource.id} (detach) returned ${patchRes.status} — ${text}`);
        } else {
          summary.phoneNumberDetached = true;
        }
      } else {
        summary.errors.push(`no Vapi phone-number resource found matching ${phoneNumber} — nothing to detach`);
      }
    } catch (err) {
      summary.errors.push(`phone-number lookup/detach failed — ${err.message}`);
    }
  }

  try {
    await patchAssistantMetadata(assistantId, clientId, {
      voicePaused: true,
      voicePausedAt: new Date().toISOString(),
    });
    summary.metadataStamped = true;
  } catch (err) {
    summary.errors.push(`assistant metadata stamp failed — ${err.message}`);
  }

  return summary;
}

/**
 * Re-enables a client's Vapi assistant: re-attaches it to its phone number
 * (if one exists) and clears the paused metadata stamp. Never throws.
 */
export async function resumeVapiAssistant({ clientId, assistantId, phoneNumber }) {
  const summary = {
    assistantId,
    phoneNumberFound: false,
    phoneNumberReattached: false,
    metadataCleared: false,
    errors: [],
  };
  if (!assistantId) {
    summary.errors.push("no vapi_assistant_id on file — nothing to re-enable");
    return summary;
  }
  if (!process.env.VAPI_PRIVATE_KEY) {
    summary.errors.push("VAPI_PRIVATE_KEY is not set");
    return summary;
  }

  if (phoneNumber) {
    try {
      const resource = await findPhoneNumberResource(phoneNumber);
      if (resource) {
        summary.phoneNumberFound = true;
        const patchRes = await fetch(`${VAPI_BASE}/phone-number/${resource.id}`, {
          method: "PATCH",
          headers: vapiHeaders(),
          body: JSON.stringify({ provider: "vapi", assistantId }),
        });
        if (!patchRes.ok) {
          const text = await patchRes.text().catch(() => "");
          summary.errors.push(`Vapi PATCH /phone-number/${resource.id} (reattach) returned ${patchRes.status} — ${text}`);
        } else {
          summary.phoneNumberReattached = true;
        }
      } else {
        summary.errors.push(`no Vapi phone-number resource found matching ${phoneNumber} — nothing to reattach`);
      }
    } catch (err) {
      summary.errors.push(`phone-number lookup/reattach failed — ${err.message}`);
    }
  }

  try {
    await patchAssistantMetadata(assistantId, clientId, { voicePaused: false });
    summary.metadataCleared = true;
  } catch (err) {
    summary.errors.push(`assistant metadata clear failed — ${err.message}`);
  }

  return summary;
}
