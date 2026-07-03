import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uvolvfwbzyfipzuuppqg.supabase.co',
      },
    ],
    // 图片缓存优化
    minimumCacheTTL: 60 * 60 * 24, // 24小时缓存
    formats: ['image/webp'],
  },
};

export default nextConfig;
