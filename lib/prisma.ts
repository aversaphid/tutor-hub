import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

import { getEnv } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const tursoUrl = getEnv("TURSO_DATABASE_URL");
  const tursoAuthToken = getEnv("TURSO_AUTH_TOKEN");

  // If Turso credentials are provided, connect via libSQL adapter
  if (tursoUrl && tursoAuthToken) {
    console.log("[Prisma] Connecting to Turso with adapter-libsql...");
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
      fetch: (input: any, init: any) =>
        fetch(input, {
          ...init,
          keepalive: false, // Prevents dead TCP socket reuse after serverless isolate sleep/freeze
        }),
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({
      adapter,
      log: getEnv("NODE_ENV") === "development" ? ["warn", "error"] : ["error"],
    });
  }

  console.warn(
    "[Prisma] Warning: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not detected. Falling back to local SQLite client."
  );

  // Fallback to standard local client (e.g. SQLite via DATABASE_URL)
  return new PrismaClient({
    log: getEnv("NODE_ENV") === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Ensure the client instance is reused across hot reloads and standalone server worker threads
globalForPrisma.prisma = prisma;

export default prisma;

