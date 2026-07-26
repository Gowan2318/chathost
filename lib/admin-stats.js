import { VOICE_PLANS, VOICE_PLAN_IDS, isValidVoicePlan, chatMessageLimitFor } from "./plans";

// Deliberately reads only the top-level billing-plan column, not
// row.config?.plan — that field is the builder's "basic"/"pro"
// config-complexity toggle (a different axis that happens to share the
// string "pro"), not a billing plan. See app/api/chat/route.js for the
// same reasoning applied to usage enforcement.
export function planOf(row) {
  return isValidVoicePlan(row?.plan) ? row.plan : null;
}

export function normalizeClient(row) {
  const plan = planOf(row);
  const limit = plan ? chatMessageLimitFor(plan) : null;
  const used = row.monthly_message_count ?? 0;

  return {
    clientId: row.client_id,
    businessName: row.config?.businessName || "Unnamed business",
    industry: row.config?.industry || "other",
    plan,
    status: row.subscription_status || "inactive",
    messagesUsed: used,
    messageLimit: limit,
    usagePct: limit > 0 ? (used / limit) * 100 : 0,
    currentPeriodEnd: row.current_period_end || null,
    createdAt: row.created_at || null,
    stripeCustomerId: row.stripe_customer_id || null,
    hasVoice: Boolean(row.vapi_assistant_id),
    voiceMinutesUsed: Number(row.voice_minutes_used) || 0,
    voiceMinutesLimit: typeof row.voice_minutes_limit === "number" ? row.voice_minutes_limit : null,
    voicePlan: row.voice_plan || null,
    voicePaused: Boolean(row.voice_paused),
  };
}

/** Shapes raw `chatbots` rows into the stats + table data the admin dashboard renders. */
export function buildAdminStats(rows) {
  const clients = rows.map(normalizeClient);
  const active = clients.filter((c) => c.status === "active");

  // Count + revenue per plan tier, keyed by VOICE_PLAN_IDS (starter/growth/pro)
  // — replaces the old two-tier basic/proActive counters now that pricing
  // has three tiers (see lib/plans.js VOICE_PLANS for the source of truth).
  const planCounts = Object.fromEntries(VOICE_PLAN_IDS.map((id) => [id, 0]));
  for (const c of active) {
    if (c.plan && planCounts[c.plan] !== undefined) planCounts[c.plan] += 1;
  }

  const totalClients = active.length;
  const monthlyRevenue = VOICE_PLAN_IDS.reduce(
    (sum, id) => sum + planCounts[id] * VOICE_PLANS[id].price,
    0
  );
  const totalMessages = active.reduce((sum, c) => sum + c.messagesUsed, 0);
  const avgMessages = totalClients > 0 ? totalMessages / totalClients : 0;

  const alerts = active
    .filter((c) => c.usagePct >= 80)
    .sort((a, b) => b.usagePct - a.usagePct);

  return {
    clients,
    totalClients,
    monthlyRevenue,
    totalMessages,
    avgMessages,
    planCounts,
    alerts,
  };
}
