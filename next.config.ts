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
    webpackBuildWorker: true
  },

  // 域名重定向：非 www 域名重定向到 www 域名 (SEO 最佳实践)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'monna.us',
          },
        ],
        destination: 'https://www.monna.us/:path*',
        permanent: true, // 301 永久重定向
      },
    ];
  },

  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options",   value: "nosniff" },
        { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
        // SEO: 添加更多安全头
        { key: "X-Frame-Options",          value: "DENY" },
        { key: "X-XSS-Protection",         value: "1; mode=block" },
        { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
      ]
    }];
  }
};

export default nextConfig;
