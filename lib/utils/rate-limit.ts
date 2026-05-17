/**
 * Simple in-memory rate limiter (per IP, per endpoint instance).
 * Good enough for a single-process Node.js server (Railway).
 * For multi-instance deployments, replace with Redis-backed solution.
 */

type Entry = { count: number; resetAt: number };

export function createRateLimiter(max: number, windowMs: number) {
  const map = new Map<string, Entry>();

  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = map.get(ip);

    if (!entry || now > entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }

    entry.count += 1;
    return entry.count > max;
  };
}

/** Extracts the real client IP from Next.js request headers. */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
