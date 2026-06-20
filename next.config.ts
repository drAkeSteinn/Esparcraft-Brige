import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Tell Turbopack/Next.js that THIS directory is the project root.
  // Without this, Next.js detects /home/z/my-project/bun.lock (parent) as the
  // workspace root and loads the parent .env, breaking DATABASE_URL resolution.
  turbopack: {
    root: path.join(__dirname),
  },
  // Allow the Z.ai preview domain to access dev resources (e.g. stack frames)
  allowedDevOrigins: ["*.space-z.ai"],
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
