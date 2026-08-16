// Shared in-memory cache + lightweight per-instance rate limiter.
// Safe for Vercel serverless: cache is best-effort and never required for correctness.
const CACHE = new Map();
const RATE = new Map();
const DEFAULT_TTL = 30 * 60 * 1000;
const MAX_CACHE = 500;
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

export function cacheGet(key) {
  const item = CACHE.get(String(key));
  if (!item) return null;
  if (Date.now() >= item.exp) {
    CACHE.delete(String(key));
    return null;
  }
  return item.data;
}

export function cacheSet(key, data, ttl = DEFAULT_TTL) {
  const k = String(key);
  if (CACHE.size >= MAX_CACHE && !CACHE.has(k)) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
  CACHE.set(k, { data, exp: Date.now() + Math.max(1000, Number(ttl) || DEFAULT_TTL) });
  return data;
}

export function cacheStats() {
  return { entries: CACHE.size, maxEntries: MAX_CACHE };
}

export function isRateLimited(ip = 'unknown') {
  const key = String(ip || 'unknown');
  const now = Date.now();
  const current = RATE.get(key);
  if (!current || now >= current.resetAt) {
    const resetAt = now + WINDOW_MS;
    RATE.set(key, { count: 1, resetAt });
    return { limited: false, remaining: MAX_REQUESTS - 1, resetAt };
  }

  current.count += 1;
  const limited = current.count > MAX_REQUESTS;
  return {
    limited,
    remaining: Math.max(0, MAX_REQUESTS - current.count),
    resetAt: current.resetAt,
  };
}
