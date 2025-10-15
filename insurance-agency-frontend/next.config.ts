import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Don’t run ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Allow production builds to complete even with TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
