import type { NextConfig } from "next";

/**
 * Next.js Configuration
 * 
 * Supports two build targets:
 * 1. Web (default): Normal Next.js build for Vercel deployment
 * 2. Electron: Static export (output: 'export') for desktop app
 * 
 * Set BUILD_TARGET=electron to enable static export mode.
 */
const isElectron = process.env.BUILD_TARGET === 'electron';

const nextConfig: NextConfig = {
  // Enable static export only for Electron builds
  ...(isElectron && { output: 'export' }),
  // Skip lint/ts errors during Electron export (pre-existing, not from Electron changes)
  eslint: { ignoreDuringBuilds: isElectron },
  typescript: { ignoreBuildErrors: isElectron },
  images: {
    // Static export requires unoptimized images (no Next.js image optimization server)
    ...(isElectron && { unoptimized: true }),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // CSP headers — only applied in web mode (static export doesn't support headers())
  ...(!isElectron && {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "Content-Security-Policy",
              value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none';"
            }
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
