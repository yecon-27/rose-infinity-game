import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => ({
  // next dev 与 next build 分开写缓存，避免同时运行时互相覆盖 chunk。
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  reactStrictMode: true,
  images: {
    // 原画在仓库内预先转成 WebP。直接从 Vercel 静态 CDN 返回，避免
    // /_next/image 第一次访问时现场转码造成换幕空白。
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/audio/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
});

export default nextConfig;
