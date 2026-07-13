/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // 开发时跳过图片优化缓存,换同名图即时生效(免去 rm -rf .next/cache/images);
    // 生产构建仍然优化。
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
