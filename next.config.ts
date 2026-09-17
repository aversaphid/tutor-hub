import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@libsql/client/**/*"],
  },
};

export default nextConfig;
