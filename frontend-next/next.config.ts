import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable turbopack for faster builds
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.ts',
    },
  },
  // API proxy for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
  // Enable static optimization for better performance
  output: 'standalone',
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
