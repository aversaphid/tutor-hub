import { BillingDurationMode } from "@/lib/billing";

let cachedSubwaySurfers: { value: boolean; expiresAt: number } | null = null;
let cachedBillingDurationMode: { value: BillingDurationMode; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60s memory cache

export function getCachedSubwaySurfersSetting(): boolean | null {
  if (cachedSubwaySurfers && cachedSubwaySurfers.expiresAt > Date.now()) {
    return cachedSubwaySurfers.value;
  }
  return null;
}

export function setCachedSubwaySurfersSetting(enabled: boolean) {
  cachedSubwaySurfers = {
    value: enabled,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function getCachedBillingDurationMode(): BillingDurationMode | null {
  if (cachedBillingDurationMode && cachedBillingDurationMode.expiresAt > Date.now()) {
    return cachedBillingDurationMode.value;
  }
  return null;
}

export function setCachedBillingDurationMode(mode: BillingDurationMode) {
  cachedBillingDurationMode = {
    value: mode,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function invalidateSettingsCache() {
  cachedSubwaySurfers = null;
  cachedBillingDurationMode = null;
}
