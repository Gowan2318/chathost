import { PLAN_LIMITS } from "./plans";

export const PLAN_PRICE = { basic: 40, pro: 60 };

export function planOf(row) {
  const plan = row?.plan ?? row?.config?.plan;
  return plan === "pro" ? "pro" : "basic";
}

export function normalizeClient(row) {
  const plan = planOf(row);
  const limit = PLAN_LIMITS[plan];
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
  };
}

/** Shapes raw `chatbots` rows into the stats + table data the admin dashboard renders. */
export function buildAdminStats(rows) {
  const clients = rows.map(normalizeClient);
  const active = clients.filter((c) => c.status === "active");

  const basicActive = active.filter((c) => c.plan === "basic").length;
  const proActive = active.filter((c) => c.plan === "pro").length;

  const totalClients = active.length;
  const monthlyRevenue = basicActive * PLAN_PRICE.basic + proActive * PLAN_PRICE.pro;
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
    basicActive,
    proActive,
    alerts,
  };
}
