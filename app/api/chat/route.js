import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";
import { sendUsageWarningEmail, sendLimitReachedEmail } from "../../../lib/email";
import { PLAN_LIMITS } from "../../../lib/plans";
import { composeBusinessInfo } from "../../../lib/builder-form";
import {
  anthropicClient,
  VALID_INDUSTRIES,
  buildSystemPrompt,
  toApiMessages,
  extractText,
} from "../../../lib/chat-shared";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function formatResetDate(monthStart) {
  const next = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

// Returns { allowed, nextCount, resetPromise, plan, limit, resetDate, businessName, userId } —
// nextCount is the value to persist after this message goes through
// (either "denied" leaves count untouched, or count + 1). Takes the chatbot
// row already fetched by the caller — no extra DB read here. resetPromise is
// the in-flight monthly-reset write (or null) — the caller is responsible for
// making sure it's awaited via after() so it isn't dropped if the serverless
// instance freezes right after the response is sent.
function computeUsage(clientId, bot) {
  const monthStart = currentMonthStart();
  const resetDate = bot.usage_reset_date ? new Date(bot.usage_reset_date) : null;
  const needsReset = !resetDate || resetDate < monthStart;
  const currentCount = needsReset ? 0 : bot.monthly_message_count ?? 0;

  const resetPromise = needsReset
    ? adminClient()
        .from("chatbots")
        .update({ monthly_message_count: 0, usage_reset_date: toDateOnly(monthStart) })
        .eq("client_id", clientId)
        .then(() => {})
        .catch(() => {})
    : null;

  // The top-level `plan` column is kept in sync with Stripe (upgrades/downgrades),
  // config.plan only reflects what was chosen at signup — prefer the live value.
  const plan = (bot.plan ?? bot.config?.plan) === "pro" ? "pro" : "basic";
  const limit = PLAN_LIMITS[plan];
  const shared = {
    plan,
    limit,
    resetPromise,
    resetDate: formatResetDate(monthStart),
    businessName: bot.config?.businessName ?? "your business",
    userId: bot.user_id,
  };

  if (currentCount >= limit) {
    return { allowed: false, nextCount: currentCount, ...shared };
  }

  return { allowed: true, nextCount: currentCount + 1, ...shared };
}

async function incrementUsage(clientId, nextCount) {
  if (!clientId || nextCount === null) return;
  try {
    const db = adminClient();
    await db.from("chatbots").update({ monthly_message_count: nextCount }).eq("client_id", clientId);
  } catch {
    // Non-fatal — never block the chat response
  }
}

// Fire-and-forget — sends at most one email per triggering message, preferring
// the limit-reached notice over the 80% warning if both thresholds coincide.
async function sendUsageNotifications({ userId, businessName, plan, limit, nextCount, resetDate }) {
  if (!userId || nextCount === null) return;

  const limitReached = nextCount >= limit;
  const warningThreshold = nextCount === Math.floor(limit * 0.8);
  if (!limitReached && !warningThreshold) return;

  try {
    const db = adminClient();
    const { data, error } = await db.auth.admin.getUserById(userId);
    const ownerEmail = data?.user?.email;
    if (error || !ownerEmail) return;

    if (limitReached) {
      await sendLimitReachedEmail({ ownerEmail, businessName, plan, limit, resetDate });
    } else {
      await sendUsageWarningEmail({ ownerEmail, businessName, plan, used: nextCount, limit, resetDate });
    }
  } catch (err) {
    console.error("[api/chat] usage notification failed:", err);
  }
}

async function logConversation(clientId, sessionId, userContent, assistantContent) {
  if (!clientId || !sessionId) return;
  try {
    const db = adminClient();
    // Upsert conversation row keyed on (client_id, session_id)
    const { data: convo } = await db
      .from("conversations")
      .upsert(
        { client_id: clientId, session_id: sessionId, message_count: 0 },
        { onConflict: "client_id,session_id", ignoreDuplicates: false }
      )
      .select("id, message_count")
      .maybeSingle();

    const convoId = convo?.id;
    if (!convoId) return;

    await Promise.all([
      db.from("messages").insert({ conversation_id: convoId, client_id: clientId, role: "user", content: userContent }),
      db.from("messages").insert({ conversation_id: convoId, client_id: clientId, role: "assistant", content: assistantContent }),
      db.from("conversations").update({ message_count: (convo.message_count ?? 0) + 2 }).eq("id", convoId),
    ]);
  } catch {
    // Non-fatal — never block the chat response
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsJson(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init.headers },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    if (await isIpBlocked(clientIp)) {
      return corsJson({ error: "Access denied" }, { status: 403 });
    }

    const { allowed } = await checkRateLimit(clientIp, "/api/chat", 15, 60);
    if (!allowed) {
      await autoBlockIfAbusive(clientIp);
      return corsJson(
        { error: "Too many requests, please try again in a minute" },
        { status: 429 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return corsJson({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { messages, clientId, sessionId } = body;

    if (!Array.isArray(messages) || messages.length > 50) {
      return corsJson({ error: "Invalid messages array" }, { status: 400 });
    }
    for (const msg of messages) {
      if (msg?.content != null && String(msg.content).length > 2000) {
        return corsJson({ error: "Message content too long (max 2000 characters)" }, { status: 400 });
      }
    }

    const apiMessages = toApiMessages(messages);

    if (apiMessages.length === 0) {
      return corsJson({ error: "No messages provided" }, { status: 400 });
    }

    if (!clientId || !UUID_RE.test(clientId)) {
      return corsJson({ error: "Invalid clientId" }, { status: 400 });
    }

    // Fetch the chatbot's config server-side — never trust businessInfo/
    // businessName/industry sent by the client, or anyone could spend our
    // Anthropic API budget with arbitrary prompts and no paying account behind them.
    const db = adminClient();
    const { data: bot, error: botError } = await db
      .from("chatbots")
      .select("config, monthly_message_count, usage_reset_date, user_id, plan, subscription_status")
      .eq("client_id", clientId)
      .maybeSingle();

    if (botError || !bot) {
      return corsJson({ error: "Chatbot not found" }, { status: 404 });
    }

    if (bot.subscription_status !== "active") {
      return corsJson(
        { error: "subscription_inactive", message: "This chatbot's subscription is not active." },
        { status: 403 }
      );
    }

    const config = bot.config || {};
    const businessName = config.businessName || "this business";
    const safeIndustry = VALID_INDUSTRIES.has(config.industry) ? config.industry : "other";
    const businessInfo = composeBusinessInfo(config);

    const usage = computeUsage(clientId, bot);
    if (usage.resetPromise) {
      // Guarantee the monthly-reset write completes even if the serverless
      // instance freezes immediately after the response is sent.
      after(() => usage.resetPromise);
    }
    if (!usage.allowed) {
      return corsJson(
        {
          error: "monthly_limit_reached",
          message:
            "This chatbot has reached its monthly message limit. Please contact the business for assistance.",
        },
        { status: 429 }
      );
    }

    const response = await anthropicClient.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 450,
      system: buildSystemPrompt(businessName, businessInfo, safeIndustry),
      messages: apiMessages,
    });

    const message = extractText(response.content);

    if (!message) {
      return corsJson({ error: "No response from the model" }, { status: 500 });
    }

    // Best-effort — don't await, never slows down response
    const lastUserMsg = apiMessages[apiMessages.length - 1]?.content ?? "";
    logConversation(clientId, sessionId, lastUserMsg, message);
    sendUsageNotifications(usage);

    // Usage counting gates billing limits — guarantee it completes via
    // after() instead of a bare fire-and-forget call.
    after(() => incrementUsage(clientId, usage.nextCount));

    return corsJson({ message });
  } catch (error) {
    console.error("[api/chat] error:", error);
    return corsJson({ error: "Unable to process your request. Please try again." }, { status: 500 });
  }
}
