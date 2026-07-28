import type { NextConfig } from "next";

/** Public-folder assets served as static files (not App Router pages). */
const PUBLIC_STATIC_EXTENSIONS =
  "html|js|css|png|jpg|jpeg|gif|webp|svg|ico|json|txt|xml|woff|woff2|ttf|map";

// Vapi's browser web-call SDK (@vapi-ai/web, app/voice-demo/[clientId]/VoiceDemoClient.jsx)
// is built on Daily's daily-js under the hood (confirmed via Daily's official CSP guide:
// https://docs.daily.co/guides/privacy-and-security/content-security-policy — this is the
// authoritative source since Vapi doesn't publish its own CSP doc). Verbatim requirements
// from that guide for daily-js's call-object mode (not Prebuilt, so no frame-src change
// needed), re-checked after a one-way-audio bug (assistant heard, user's mic never arrived —
// confirmed via Vapi call transcripts showing zero user speech across every call):
//   - script-src needs 'unsafe-eval' + blob: BY DEFAULT — call-object mode loads its call
//     bundle via a Function() call, which requires eval. Daily's docs describe the
//     avoidEval:true + 'wasm-unsafe-eval' combo (which the previous version of this file
//     used, to keep 'unsafe-eval' out of prod) as "an optional workaround for CSP-strict
//     environments, not a general recommendation" — and 'wasm-unsafe-eval' specifically is
//     documented as only needed for video virtual-background/blur processing (which this
//     voice-only demo doesn't use). Every affected call happened after avoidEval was added,
//     with no working baseline before it, so it's the prime suspect for the audio pipeline
//     silently failing to publish the local track. Reverted to the documented default here
//     and in the `new Vapi(...)` call (dropped avoidEval).
//   - connect-src: https://api.vapi.ai (creates the web call), https://*.daily.co and
//     https://*.pluot.blue (Daily's signaling/media infra — gs.daily.co, c.daily.co, and
//     other Daily-operated hosts live under these), wss: (WebSocket signaling — Daily's own
//     guide recommends the scheme broadly since the signaling host varies by region/session
//     rather than a fixed enumerable domain).
//   - media-src: NOT listed in Daily's guide at all (confirmed on two separate reads) —
//     WebRTC audio is attached via `audio.srcObject`, which no browser's media-src ever
//     governs. Added `'self' blob:` defensively/narrowly anyway (no external domains) in
//     case any blob-URL playback path exists internally; nothing else added here.
// Deliberately NOT added: *.banuba.cloud (Daily's virtual-background/blur provider — only
// needed for video effects we don't use) and no bare "*" anywhere.
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com *.vercel-insights.com vercel.live https://*.daily.co blob:`,
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  "img-src 'self' data: blob: *.supabase.co images.unsplash.com",
  "media-src 'self' blob:",
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
