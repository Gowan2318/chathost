import type { NextConfig } from "next";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Next.js 16.2+ on Vercel uses the Build Adapters API. Vercel injects
 * NEXT_ADAPTER_PATH during deployment builds so routing is written to
 * `.next/output`. Without it, deploys can show Ready but return 404 NOT_FOUND.
 */
function resolveAdapterPath(): string | undefined {
  if (process.env.NEXT_ADAPTER_PATH) {
    return process.env.NEXT_ADAPTER_PATH;
  }

  // Fallback when the community adapter is installed on Vercel only.
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
