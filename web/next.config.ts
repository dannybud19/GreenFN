import type { NextConfig } from "next";

// cacheComponents and partialPrefetching (create-next-app defaults) are off: every page here is plain static
// generation from public/data/, as phase7_plan.md describes (about 2,470 player pages via generateStaticParams).
const nextConfig: NextConfig = {
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
