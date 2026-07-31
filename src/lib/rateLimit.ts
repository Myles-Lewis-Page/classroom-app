// Simple in-memory sliding-window rate limiter for auth-sensitive routes
// (login, password reset, the public chaperone-interest form). This app
// runs as a single Railway instance with no Redis, so in-memory is the
// pragmatic choice - it resets on redeploy, which is an acceptable tradeoff
// for a small classroom app. If this ever runs multi-instance, swap the
// Map below for a shared store (Redis/Upstash) - the interface here would
// stay the same.
//
// Usage:
//   const result = checkRateLimit(`login:${ip}`, { max: 8, windowMs: 5 * 60_000 });
//   if (!result.allowed) return 429 with result.retryAfterSeconds

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so this Map doesn't grow unbounded over a long-running
// process. Runs lazily off the request path rather than a setInterval, to
// avoid keeping the process alive for a timer alone in serverless-ish
// environments.
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 10 * 60_000;

function cleanupIfDue() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    // A bucket entry is stale once it's more than a couple of windows old -
    // 30 minutes is generously longer than any window this app uses.
    if (now - bucket.windowStart > 30 * 60_000) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, { max, windowMs }: RateLimitOptions): RateLimitResult {
  cleanupIfDue();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > max) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

// Best-effort client IP extraction behind Railway's reverse proxy.
// x-forwarded-for can contain a comma-separated chain (client, proxy1,
// proxy2...) - the first entry is the original client.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
