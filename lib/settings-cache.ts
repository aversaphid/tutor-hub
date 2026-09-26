let cachedSubwaySurfers: { value: boolean; expiresAt: number } | null = null;
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

export function invalidateSettingsCache() {
  cachedSubwaySurfers = null;
}
