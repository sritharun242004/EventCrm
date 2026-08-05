import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Do NOT set serverExternalPackages here — on Amplify's SSR compute, external
  // packages are not guaranteed to be in the Lambda's node_modules. Letting
  // Next bundle @prisma/client + @prisma/adapter-pg into the RSC chunks means
  // every dynamic route can reach the DB at request time.
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default config;
