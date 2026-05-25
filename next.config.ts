import type { NextConfig } from "next";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Required on Vercel for Next.js 16.2+ so routes are emitted to `.next/output`. */
function resolveAdapterPath(): string | undefined {
  if (process.env.NEXT_ADAPTER_PATH) {
    return process.env.NEXT_ADAPTER_PATH;
  }

  if (process.env.VERCEL) {
    try {
      return require.resolve("@next-community/adapter-vercel");
    } catch {
      return undefined;
    }
  }

  return undefined;
}

const adapterPath = resolveAdapterPath();

const nextConfig: NextConfig = {
  ...(adapterPath ? { adapterPath } : {}),
};

export default nextConfig;
