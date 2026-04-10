import type { NextConfig } from "next";

/** Hosts (no protocol) allowed to talk to the dev server — needed for Cursor/VS Code previews and port tunnels. */
const defaultAllowedDevOrigins = [
  "localhost:3004",
  "127.0.0.1:3004",
  "[::1]:3004",
];
const extraAllowedDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((h) => h.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...defaultAllowedDevOrigins, ...extraAllowedDevOrigins],
  // Avoid picking a parent directory when multiple package-lock.json files exist (e.g. ~/package-lock.json).
  turbopack: {
    root: process.cwd(),
  },
  // Tree-shake heavy barrel packages (icons / animation) — smaller client bundles.
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    // In `next dev`, Cursor/VS Code Simple Browser often loads the app inside an iframe/webview.
    // Production CSP + X-Frame-Options: DENY + frame-ancestors 'none' breaks that embed and can
    // block Turbopack HMR (ws://) or confuse webviews with upgrade-insecure-requests.
    if (process.env.NODE_ENV === "development") {
      return [];
    }

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https: wss:",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
