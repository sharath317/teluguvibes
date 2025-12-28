import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from any domain (news sources use many different CDNs)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP domains (some news sites use HTTP)
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
