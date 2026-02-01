import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Turbopack for faster local development
  // This is the default in Next.js 15+, but explicitly enabling ensures it's used
  turbopack: {},
};

export default nextConfig;
