import type { NextConfig } from "next";

/** Public-folder assets served as static files (not App Router pages). */
const PUBLIC_STATIC_EXTENSIONS =
  "html|js|css|png|jpg|jpeg|gif|webp|svg|ico|json|txt|xml|woff|woff2|ttf|map";

const isDev = process.env.NODE_ENV === "development";

// Vapi's browser web-call SDK (@vapi-ai/web, app/voice-demo/[clientId]/VoiceDemoClient.jsx)
// is built on Daily's daily-js under the hood (confirmed via Daily's official CSP guide:
// https://docs.daily.co/guides/privacy-and-security/content-security-policy — this is the
// authoritative source since Vapi doesn't publish its own CSP doc). Requirements for
// daily-js's call-object mode (not Prebuilt, so no frame-src change needed):
//   - script-src: https://*.daily.co loads a small "call machine" bundle from c.daily.co;
//     Daily's WebAssembly audio pipeline needs either 'unsafe-eval' or the narrower
//     'wasm-unsafe-eval' + avoidEval:true passed to the Vapi/Daily call object. We use the
//     narrower option (see the `new Vapi(...)` call) to avoid reintroducing 'unsafe-eval'
//     in production.
//   - connect-src: https://api.vapi.ai (creates the web call), https://*.daily.co and
//     https://*.pluot.blue (Daily's signaling/media infra — gs.daily.co, c.daily.co, and
//     other Daily-operated hosts live under these), wss: (WebSocket signaling — Daily's own
//     guide recommends the scheme broadly since the signaling host varies by region/session
//     rather than a fixed enumerable domain).
// Deliberately NOT added: *.banuba.cloud (Daily's virtual-background/blur provider — only
// needed for video effects we don't use) and no bare "*" anywhere.
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} js.stripe.com *.vercel-insights.com vercel.live https://*.daily.co 'wasm-unsafe-eval'`,
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  "img-src 'self' data: blob: *.supabase.co images.unsplash.com",
  "connect-src 'self' *.supabase.co api.anthropic.com api.firecrawl.dev api.resend.com *.stripe.com *.vercel-insights.com vercel.live https://api.vapi.ai https://*.daily.co https://*.pluot.blue wss:",
  "frame-src 'self' js.stripe.com *.stripe.com calendly.com *.calendly.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/((?!api/).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
      {
        source: "/widget.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: `/:path*.(${PUBLIC_STATIC_EXTENSIONS})`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
