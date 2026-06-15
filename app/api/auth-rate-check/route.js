import { NextResponse } from "next/server";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";

const LIMITS = {
  login:  { maxRequests: 10, windowSeconds: 15 * 60 },
  signup: { maxRequests: 5,  windowSeconds: 60 * 60 },
};

export async function POST(request) {
  const clientIp = getClientIp(request);

  if (await isIpBlocked(clientIp)) {
    return NextResponse.json(
      { error: "Access denied. Please contact support if you believe this is an error." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { type } = body;
  const limit = LIMITS[type];
  if (!limit) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const { allowed } = await checkRateLimit(
    clientIp,
    `/api/auth/${type}`,
    limit.maxRequests,
    limit.windowSeconds
  );

  if (!allowed) {
    await autoBlockIfAbusive(clientIp);
    const message =
      type === "login"
        ? "Too many login attempts. Please wait 15 minutes before trying again."
        : "Too many sign-up attempts. Please wait an hour before trying again.";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  return NextResponse.json({ ok: true });
}
