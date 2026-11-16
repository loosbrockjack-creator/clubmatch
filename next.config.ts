import { existsSync } from "node:fs";
import type { NextConfig } from "next";

/**
 * Local-only demo club for client demos. When this gitignored file exists and
 * the build isn't on Vercel, it replaces the empty lib/local-demo.ts. The live
 * site never has it, because the file is never committed.
 */
const LOCAL_DEMO = "./active/execution/local-demo/index.ts";
const useLocalDemo = !process.env.VERCEL && existsSync(LOCAL_DEMO);

/**
 * A production deploy with a setting missing would otherwise look fine and quietly
 * misbehave: payments that never activate a club, share links to the wrong site.
 * So it stops the build and names what's missing. Local and preview builds aren't
 * affected. Claim alert email is optional and only warns when it runs.
 */
const REQUIRED_IN_PRODUCTION = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
];

if (process.env.VERCEL_ENV === "production") {
  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing production settings: ${missing.join(", ")}`);
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: useLocalDemo ? { "@/lib/local-demo": LOCAL_DEMO } : {},
  },
  images: {
    // 75 is the default for every photo; 90 is for the watercolor club covers.
    qualities: [75, 90],
    // Profile photos uploaded to Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bvttohfhctvjkywjftby.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
};

export default nextConfig;
