import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client/web";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  const deno = (globalThis as any).Deno;
  if (deno && typeof deno.env?.get === "function") {
    return deno.env.get(key);
  }
  return undefined;
}

function createPrismaClient() {
  const tursoUrl = getEnv("TURSO_DATABASE_URL");
  const tursoAuthToken = getEnv("TURSO_AUTH_TOKEN");

  // If Turso credentials are provided, connect via libSQL adapter
  if (tursoUrl && tursoAuthToken) {
    console.log("[Prisma] Connecting to Turso with adapter-libsql...");
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
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

if (getEnv("NODE_ENV") !== "production") globalForPrisma.prisma = prisma;

export default prisma;

