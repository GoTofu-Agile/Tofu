import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake heavy barrel packages (icons / animation) — smaller client bundles.
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
