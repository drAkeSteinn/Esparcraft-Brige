import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Módulos nativos que deben ser excluidos del bundling de Next.js
  serverExternalPackages: [
    '@lancedb/lancedb',
    '@lancedb/lancedb-linux-x64-gnu',
    '@lancedb/lancedb-linux-x64-musl',
    '@lancedb/lancedb-linux-arm64-gnu',
    '@lancedb/lancedb-linux-arm64-musl',
    '@lancedb/lancedb-darwin-arm64',
    '@lancedb/lancedb-darwin-x64',
    '@lancedb/lancedb-win32-x64-msvc',
    '@lancedb/lancedb-win32-arm64-msvc',
  ],
};

export default nextConfig;
