import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

function supabaseHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const hostname = supabaseHostname();

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: hostname
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ],
        minimumCacheTTL: 31_536_000,
      }
    : undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default bundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(
  nextConfig,
);
