import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Environment variables configuration
  env: {
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
  },
  // Webpack configuration if needed
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure client-side only modules are not included in the server bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  /* config options here */
};

export default nextConfig;
