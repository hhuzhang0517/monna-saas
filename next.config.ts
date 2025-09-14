import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 允许局域网设备访问开发服务器
  allowedDevOrigins: [
    'http://192.168.10.105:3003',
    'http://192.168.10.108:3003',
    'http://localhost:3003',
    '192.168.10.105',
    '192.168.10.108',
    'localhost'
  ],
  experimental: {
    ppr: false,  // 暂时关闭 PPR
    clientSegmentCache: false,  // 暂时关闭客户端段缓存
    nodeMiddleware: true
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options",   value: "nosniff" },
        { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" }
      ]
    }];
  }
};

export default nextConfig;
