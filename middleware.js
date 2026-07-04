import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getClientIp, isIpBlocked } from "./lib/rateLimit";

export async function middleware(request) {
  const ip = getClientIp(request);
  const isLocal = ip === "::1" || ip === "127.0.0.1" || ip === "unknown";
  if (!isLocal && await isIpBlocked(ip)) {
    return new NextResponse("Access denied", { status: 403 });
  }

  let response = NextResponse.next({ request });

  // Refresh the Supabase auth cookie so Server Components (e.g. /admin) see
  // a valid, up-to-date session instead of a stale/expired token.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.getUser();
  }

  if (process.env.SITE_LIVE === "true") {
    return response;
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/coming-soon") ||
    pathname.startsWith("/success") ||
    pathname.startsWith("/test-widget")
  ) {
    return response;
  }

  if (pathname.startsWith("/api")) {
    return response;
  }

  if (pathname.startsWith("/_next")) {
    return response;
  }

  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return response;
  }

  return NextResponse.redirect(new URL("/coming-soon", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:html|js|css|png|jpg|jpeg|gif|webp|svg|ico|json|txt|xml|woff|woff2|ttf|map)$).*)",
  ],
};
