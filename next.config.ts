import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Configuración para Turbopack (Next.js 16+)
  turbopack: {
    // Configuración para manejar módulos nativos
    resolveAlias: {},
  },
  serverExternalPackages: [
    '@lancedb/lancedb',
    '@lancedb/lancedb-linux-x64-gnu',
    '@lancedb/lancedb-win32-x64-msvc',
    '@lancedb/lancedb-darwin-arm64',
  ],
};

export default nextConfig;
