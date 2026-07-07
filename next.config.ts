import type { NextConfig } from "next";

/** Public-folder assets served as static files (not App Router pages). */
const PUBLIC_STATIC_EXTENSIONS =
  "html|js|css|png|jpg|jpeg|gif|webp|svg|ico|json|txt|xml|woff|woff2|ttf|map";

const isDev = process.env.NODE_ENV === "development";

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} js.stripe.com *.vercel-insights.com vercel.live`,
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  "img-src 'self' data: blob: *.supabase.co images.unsplash.com",
  "connect-src 'self' *.supabase.co api.anthropic.com api.firecrawl.dev api.resend.com *.stripe.com *.vercel-insights.com vercel.live",
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
