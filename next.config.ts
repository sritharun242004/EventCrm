import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Prisma 7 client is ESM — Next needs it as an external server package
  // so the Node runtime resolves it against node_modules instead of trying
  // to bundle it into the RSC graph.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default config;
