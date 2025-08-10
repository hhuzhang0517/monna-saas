import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    nodeMiddleware: true
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options",   value: "nosniff" },
        { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" }
      ]
    }];
  }
};

export default nextConfig;
