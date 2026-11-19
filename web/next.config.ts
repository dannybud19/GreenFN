import type { NextConfig } from "next";

// cacheComponents and partialPrefetching (create-next-app defaults) are off: every page here is plain static
// generation from public/data/, as phase7_plan.md describes (about 2,470 player pages via generateStaticParams).
// Phase 7b: one page. The old /map and /about pages redirect to the dashboard.
const nextConfig: NextConfig = {
  redirects() {
    return [
      { source: "/map", destination: "/", permanent: true },
      { source: "/about", destination: "/", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
