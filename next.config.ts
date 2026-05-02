import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only lint app code — __tests__ and e2e are covered by tsc + vitest
    dirs: ["app", "components", "lib"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
