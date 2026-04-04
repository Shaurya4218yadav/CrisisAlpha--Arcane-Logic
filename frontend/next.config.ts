import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.3.147.109"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
