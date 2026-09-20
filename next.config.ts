import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  output: "standalone",
  compress: true,
  typescript: {
    ignoreBuildErrors: false,
  },
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
    // Ignore node:v8 and v8 built-in imports so Webpack never fails with UnhandledSchemeError
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(node:)?v8$/,
      })
    );

    // Safely rewrite any other node: prefixed imports to standard module names
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
        try {
          if (resource && typeof resource.request === "string") {
            resource.request = resource.request.replace(/^node:/, "");
          }
        } catch {
          // Ignore safely
        }
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
