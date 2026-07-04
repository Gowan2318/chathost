import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "../../../lib/supabase-server";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

const CHART_DAYS = 30;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function startOfMonthUtc(monthOffset) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
}

function daysAgoUtc(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

async function count(db, table, build) {
  const { count: n, error } = await build(db.from(table).select("*", { count: "exact", head: true }));
  if (error) {
    console.error(`[analytics] count query failed on ${table}:`, error);
    return 0;
  }
  return n ?? 0;
}

// Buckets conversation start times into one count per day for the last
// `numDays` days (oldest first), so days with zero conversations still show
// up as a bar of height zero instead of being skipped.
function buildDailyBuckets(rows, numDays) {
  const buckets = new Map();
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (let i = numDays - 1; i >= 0; i--) {
    const iso = new Date(todayUtc - i * 86400000).toISOString().slice(0, 10);
    buckets.set(iso, 0);
  }

  for (const row of rows) {
    const day = row.started_at?.slice(0, 10);
    if (day && buckets.has(day)) {
      buckets.set(day, buckets.get(day) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([date, conversations]) => ({ date, conversations }));
}

export default async function AnalyticsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const db = adminClient();

  const { data: chatbot } = await db
    .from("chatbots")
    .select("client_id, created_at, config")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!chatbot) {
    return <AnalyticsClient email={user.email} stats={null} />;
  }

  const clientId = chatbot.client_id;
  const thisMonthStart = startOfMonthUtc(0).toISOString();
  const lastMonthStart = startOfMonthUtc(-1).toISOString();
  const chartStart = daysAgoUtc(CHART_DAYS - 1).toISOString();

  const [
    conversationsThisMonth,
    conversationsLastMonth,
    conversationsAllTime,
    messagesThisMonth,
    userMessagesThisMonth,
    messagesAllTime,
    widgetOpensThisMonth,
    bookingClicksThisMonth,
    paymentClicksThisMonth,
    chartQuery,
  ] = await Promise.all([
    count(db, "conversations", (q) => q.eq("client_id", clientId).gte("started_at", thisMonthStart)),
    count(db, "conversations", (q) =>
      q.eq("client_id", clientId).gte("started_at", lastMonthStart).lt("started_at", thisMonthStart)
    ),
    count(db, "conversations", (q) => q.eq("client_id", clientId)),
    count(db, "messages", (q) => q.eq("client_id", clientId).gte("created_at", thisMonthStart)),
    count(db, "messages", (q) => q.eq("client_id", clientId).eq("role", "user").gte("created_at", thisMonthStart)),
    count(db, "messages", (q) => q.eq("client_id", clientId)),
    count(db, "widget_events", (q) =>
      q.eq("client_id", clientId).eq("event_type", "opened").gte("created_at", thisMonthStart)
    ),
    count(db, "widget_events", (q) =>
      q.eq("client_id", clientId).eq("event_type", "booking_clicked").gte("created_at", thisMonthStart)
    ),
    count(db, "widget_events", (q) =>
      q.eq("client_id", clientId).eq("event_type", "payment_clicked").gte("created_at", thisMonthStart)
    ),
    db.from("conversations").select("started_at").eq("client_id", clientId).gte("started_at", chartStart),
  ]);

  if (chartQuery.error) {
    console.error("[analytics] chart query failed:", chartQuery.error);
  }
  const chartData = buildDailyBuckets(chartQuery.data ?? [], CHART_DAYS);

  const stats = {
    businessName: chatbot.config?.businessName ?? null,
    memberSince: chatbot.created_at,
    conversationsThisMonth,
    conversationsLastMonth,
    conversationsAllTime,
    avgMessagesPerConversation: conversationsThisMonth > 0 ? messagesThisMonth / conversationsThisMonth : 0,
    userMessagesThisMonth,
    messagesAllTime,
    widgetOpensThisMonth,
    bookingClicksThisMonth,
    paymentClicksThisMonth,
    chartData,
  };

  return <AnalyticsClient email={user.email} stats={stats} />;
}
