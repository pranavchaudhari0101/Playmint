/**
 * Best-effort in-memory rate limiter. Each Worker isolate keeps its own
 * buckets, so the limit is per-isolate (not global). Good enough for
 * gameplay-earn abuse control in the demo; upgrade to a Cloudflare
 * Rate Limiting binding or Durable Object for strict global limits.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}
