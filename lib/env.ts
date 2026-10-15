/**
 * Universal environment variable accessor supporting Node.js, Next.js Edge, and Deno Deploy runtimes.
 */
export function getEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  const deno = (globalThis as any).Deno;
  if (deno && typeof deno.env?.get === "function") {
    try {
      return deno.env.get(key);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
