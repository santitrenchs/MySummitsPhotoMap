import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force the apex domain (peakadex.com) to the canonical www host.
  // NextAuth / Google OAuth are configured for www.peakadex.com; hitting the
  // apex broke the OAuth flow with error=Configuration (e.g. Chrome iOS
  // omnibox autocompleting to the apex). Redirect before it can start.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "peakadex.com" }],
        destination: "https://www.peakadex.com/:path*",
        permanent: true,
      },
    ];
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
