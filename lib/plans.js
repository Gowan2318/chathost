export const PLAN_LIMITS = { pro: 1500, basic: 500 };

// Voice receptionist plans — tiered add-on that bundles a hard voice-minute
// cap with the chat widget (free on every tier). chatbots.voice_plan stores
// one of these keys; chatbots.voice_minutes_limit is set from voiceMinutes
// below at provisioning time (scripts/setup-voice.js) and enforced in
// app/api/vapi-webhook/route.js. This is the single source of truth for
// voice plan limits — nowhere else should hardcode these numbers.
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
