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
// 'unsafe-eval' is scoped to /voice-demo only (see voiceDemoCspHeader below) rather than
// added to the site-wide script-src — Next.js's last-match-wins header override behavior
// (a later `headers()` entry matching the same path replaces the whole header value; see
// node_modules/next/dist/docs/.../headers.md "Header Overriding Behavior") lets the
// /voice-demo/:path* entry carry its own full CSP string with 'unsafe-eval' added, without
// weakening script-src for the rest of the app. The rest of the Vapi/Daily additions below
// (script-src https://*.daily.co blob:, media-src, connect-src) are specific domains rather
// than a broad eval allowance, so they're left site-wide as before.
// Deliberately NOT added: *.banuba.cloud (Daily's virtual-background/blur provider — only
// needed for video effects we don't use) and no bare "*" anywhere.
const cspDirectives = (scriptSrcExtra: string) => [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${scriptSrcExtra}js.stripe.com *.vercel-insights.com vercel.live https://*.daily.co blob:`,
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
];

const cspHeader = cspDirectives("").join("; ");
const voiceDemoCspHeader = cspDirectives("'unsafe-eval' ").join("; ");

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
      // Must come after the site-wide entry above — Next.js applies the last matching
      // header value when two entries set the same key for the same path (see
      // "Header Overriding Behavior" in the headers() doc), so this replaces the site-wide
      // CSP with the 'unsafe-eval'-inclusive one only for /voice-demo/*.
      {
        source: "/voice-demo/:path*",
        headers: [{ key: "Content-Security-Policy", value: voiceDemoCspHeader }],
      },
    ];
  },
};

export default nextConfig;
