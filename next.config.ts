import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@libsql/**/*",
      "./node_modules/@prisma/**/*",
    ],
  },
};

export default nextConfig;
