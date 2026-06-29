import { NextResponse } from "next/server";
import { getClientIp, isIpBlocked } from "./lib/rateLimit";

export async function middleware(request) {
  const ip = getClientIp(request);
  const isLocal = ip === "::1" || ip === "127.0.0.1" || ip === "unknown";
  if (!isLocal && await isIpBlocked(ip)) {
    return new NextResponse("Access denied", { status: 403 });
  }

  if (process.env.SITE_LIVE === "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/coming-soon") ||
    pathname.startsWith("/success") ||
    pathname.startsWith("/test-widget")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/coming-soon", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:html|js|css|png|jpg|jpeg|gif|webp|svg|ico|json|txt|xml|woff|woff2|ttf|map)$).*)",
  ],
};
