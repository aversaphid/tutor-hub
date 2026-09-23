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
    if (isServer) {
      // Mark node: protocol modules (including node:v8 for Deno incremental cache) as externals
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        "node:v8",
        "v8",
        ({ request }: any, callback: any) => {
          if (request && /^node:/.test(request)) {
            return callback(null, request);
          }
          callback();
        },
      ];
    } else {
      // For browser/client bundle, replace node: imports and fall back to false (empty module)
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
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.youtube-nocookie.com; child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.youtube-nocookie.com; media-src 'self' blob: data: https:; frame-ancestors 'self';",
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
