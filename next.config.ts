import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  output: "standalone",
  compress: true,
  serverExternalPackages: [
    "@libsql/client",
    "@prisma/adapter-libsql",
    "@prisma/client",
    "bcryptjs",
  ],
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@libsql/**/*",
      "./node_modules/@prisma/**/*",
    ],
  },
  webpack: (config, { webpack, isServer }) => {
    // Strip "node:" scheme prefix so Webpack 5 can handle built-in Node modules without UnhandledSchemeError
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        v8: false,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
      };
    }

    return config;
  },
  async headers() {
    const headersList: any[] = [];

    headersList.push({
      source: "/:path*",
      headers: [
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    });

    return headersList;
  },
};

export default nextConfig;
