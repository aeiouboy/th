import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Explicitly set workspace root to this directory to prevent Next.js
  // from traversing upward and loading env files from parent directories.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
