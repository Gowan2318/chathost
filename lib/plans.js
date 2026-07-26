// Voice receptionist plans — tiered add-on that bundles a hard voice-minute
// cap with the chat widget (free on every tier). chatbots.voice_plan stores
// one of these keys; chatbots.voice_minutes_limit is set from voiceMinutes
// below at provisioning time (scripts/setup-voice.js) and enforced in
// app/api/vapi-webhook/route.js. This is the single source of truth for
// voice plan limits and chat message limits — nowhere else should hardcode
// these numbers. Replaces the old two-tier "basic"/"pro" chat-only plans
// (retired — see supabase/migrations/015_retire_basic_pro_chat_plans.sql).
export const VOICE_PLANS = {
  starter: { label: "Starter", price: 100, voiceMinutes: 100, chatMessages: 500 },
  growth: { label: "Growth", price: 200, voiceMinutes: 250, chatMessages: 1500 },
  pro: { label: "Pro", price: 300, voiceMinutes: 500, chatMessages: 10000, unlimitedChat: true },
};

export const VOICE_PLAN_IDS = Object.keys(VOICE_PLANS);

export function isValidVoicePlan(voicePlan) {
  return Object.prototype.hasOwnProperty.call(VOICE_PLANS, voicePlan);
}

/** Returns the voice-minute cap for a plan id, or null if the plan id is unrecognized. */
export function voiceMinutesLimitFor(voicePlan) {
  return VOICE_PLANS[voicePlan]?.voiceMinutes ?? null;
}

/**
 * Returns the monthly chat-message cap for a plan id: Infinity for a plan
 * with unlimitedChat, the plan's chatMessages otherwise, or null if the
 * plan id is unrecognized (caller decides the fallback — never guess here).
 */
export function chatMessageLimitFor(plan) {
  const entry = VOICE_PLANS[plan];
  if (!entry) return null;
  return entry.unlimitedChat ? Infinity : entry.chatMessages;
}

/**
 * Returns the next plan id up from the given one (by VOICE_PLAN_IDS order),
 * or null if the plan is unrecognized or already the top tier — callers use
 * this to render "Upgrade to X" copy without hardcoding tier order.
 */
export function nextPlanUp(plan) {
  const index = VOICE_PLAN_IDS.indexOf(plan);
  if (index === -1 || index === VOICE_PLAN_IDS.length - 1) return null;
  return VOICE_PLAN_IDS[index + 1];
}

/**
 * Maps a Stripe amount (in cents, e.g. session.amount_total or a
 * subscription price's unit_amount) to a plan id, matched against
 * VOICE_PLANS[].price (whole-dollar list prices) — the single source of
 * truth for plan pricing. Returns null for an amount that doesn't match any
 * plan's list price exactly (e.g. a stale/unknown price) — callers should
 * log and skip rather than guess.
 */
export function voicePlanFromAmount(amountInCents) {
  if (typeof amountInCents !== "number" || !Number.isFinite(amountInCents)) return null;
  const dollars = amountInCents / 100;
  const match = Object.entries(VOICE_PLANS).find(([, plan]) => plan.price === dollars);
  return match ? match[0] : null;
}
