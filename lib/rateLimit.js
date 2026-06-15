import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

export async function isIpBlocked(ip) {
  try {
    const db = adminClient();
    const { data } = await db
      .from("blocked_ips")
      .select("expires_at")
      .eq("ip_address", ip)
      .maybeSingle();

    if (!data) return false;
    if (!data.expires_at) return true;
    return new Date(data.expires_at) > new Date();
  } catch {
    return false;
  }
}

export async function checkRateLimit(ip, route, maxRequests, windowSeconds) {
  const db = adminClient();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Opportunistically purge log rows older than 1 hour (~1% of calls).
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 3600 * 1000).toISOString();
    db.from("rate_limit_log").delete().lt("created_at", cutoff).then(() => {}).catch(() => {});
  }

  const { count } = await db
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("route", route)
    .gte("created_at", since);

  const currentCount = count ?? 0;

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  await db.from("rate_limit_log").insert({ ip_address: ip, route });

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

// Called each time an IP exceeds a rate limit. Inserts a violation marker and
// auto-blocks the IP for 24 h if it has accumulated more than 5 violations in
// the past hour across any route.
export async function autoBlockIfAbusive(ip) {
  try {
    const db = adminClient();
    const since = new Date(Date.now() - 3600 * 1000).toISOString();

    await db.from("rate_limit_log").insert({ ip_address: ip, route: "__violation__" });

    const { count } = await db
      .from("rate_limit_log")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("route", "__violation__")
      .gte("created_at", since);

    if ((count ?? 0) > 5) {
      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      await db.from("blocked_ips").upsert(
        {
          ip_address: ip,
          reason: "auto: repeated rate limit violations",
          expires_at: expiresAt,
        },
        { onConflict: "ip_address" }
      );
    }
  } catch {
    // Non-fatal — don't block the response on auto-block failures.
  }
}
