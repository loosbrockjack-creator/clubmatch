import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
