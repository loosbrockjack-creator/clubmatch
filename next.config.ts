import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 75 is the default for every photo; 90 is for the watercolor club covers.
    qualities: [75, 90],
  },
};

export default nextConfig;
