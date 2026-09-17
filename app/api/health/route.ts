import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const tursoUrl = getEnv("TURSO_DATABASE_URL");
  const hasTursoToken = Boolean(getEnv("TURSO_AUTH_TOKEN"));
  const databaseUrl = getEnv("DATABASE_URL");
  const nodeEnv = getEnv("NODE_ENV");
  const isDeno = Boolean((globalThis as any).Deno);

  const envReport = {
    hasTursoUrl: Boolean(tursoUrl),
    tursoUrlHost: tursoUrl ? tursoUrl.split("@").pop()?.split("?")[0] : null,
    hasTursoAuthToken: hasTursoToken,
    hasDatabaseUrl: Boolean(databaseUrl),
    nodeEnv: nodeEnv || "unknown",
    isDeno,
  };

  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      databaseConnected: true,
      userCount,
      env: envReport,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        status: "error",
        databaseConnected: false,
        errorMessage: error?.message || String(error),
        errorStack: error?.stack?.split("\n").slice(0, 5),
        env: envReport,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
