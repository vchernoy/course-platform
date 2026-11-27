import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Route and action authorization uses forbidden() and app/forbidden.tsx.
  experimental: { authInterrupts: true },
  // Content and config are read with fs at request time; make sure server bundles include them,
  // including the private-content/ checkout synced before the build (docs/private-content.md).
  outputFileTracingIncludes: {
    "/**": ["./content/**/*", "./config/**/*", "./private-content/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/courses/investing-basics/:lesson",
        destination: "/offerings/investing-basics-2026-05/:lesson",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
