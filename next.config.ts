import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [{ source: "/propmt", destination: "/prompt", permanent: true }];
  },

  // Standalone output packages every runtime dep — including Prisma's engine
  // files — into a self-contained .next/standalone folder that Amplify's
  // Lambda can execute directly. Combined with the trace includes below, this
  // makes sure @prisma/client + adapter + Query Engine binaries ship together.
  output: "standalone",

  // Mark Prisma as external so Next uses trace-file resolution instead of
  // bundling it (Prisma's runtime does dynamic requires that don't bundle).
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "@prisma/engines"],

  // Force the trace to include the pnpm-hoisted Prisma files even though
  // they live under a hashed .pnpm path.
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/.pnpm/**/@prisma/client/**",
      "./node_modules/.pnpm/**/@prisma/adapter-pg/**",
      "./node_modules/.pnpm/**/@prisma/engines/**",
    ],
    "/api/resources/**/*": [
      "./ceo_dashboard_starter/CLAUDE_DASHBOARD_PROMPT.md",
      "./ceo_dashboard_starter/CLAUDE_DATA_MAPPING_PROMPT.md",
      "./ceo_dashboard_starter/CXO_MINIMAL_DASHBOARD.html",
      "./eventbot_dashboard_all_data.xlsx",
      "./eventbot_dashboard_mock_data.zip",
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default config;
