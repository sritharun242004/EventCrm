// TODO(prod): swap for Redis (e.g. Upstash) — this Map is per-process and
// loses state on restart. Fine for dev + single-instance staging.

type Bucket = { failures: number; lockedUntil: number; windowStart: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
const LOCK_MS = 15 * 60 * 1000;

export function loginAttemptAllowed(email: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(email);
  if (b && b.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordLoginFailure(email: string): void {
  const now = Date.now();
  const b = buckets.get(email) ?? { failures: 0, lockedUntil: 0, windowStart: now };
  if (now - b.windowStart > WINDOW_MS) {
    b.failures = 0;
    b.windowStart = now;
  }
  b.failures += 1;
  if (b.failures >= MAX_FAILS) b.lockedUntil = now + LOCK_MS;
  buckets.set(email, b);
}

export function recordLoginSuccess(email: string): void {
  buckets.delete(email);
}
