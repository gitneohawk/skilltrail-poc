// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  output: 'standalone', // Azure Static Web Apps へのデプロイに推奨
};

export default nextConfig;
