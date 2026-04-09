type RateWindow = {
  startMs: number;
  count: number;
};

type LeaseEntry = {
  expiresAtMs: number;
};

const rateWindows = new Map<string, RateWindow>();
const leases = new Map<string, LeaseEntry>();

function nowMs() {
  return Date.now();
}

function cleanupExpiredLeases(ts: number) {
  for (const [key, entry] of leases.entries()) {
    if (entry.expiresAtMs <= ts) {
      leases.delete(key);
    }
  }
}

export function checkRateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterSeconds: number } {
  const ts = nowMs();
  const current = rateWindows.get(args.key);
  if (!current || ts - current.startMs >= args.windowMs) {
    rateWindows.set(args.key, { startMs: ts, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= args.limit) {
    const retryAfterMs = Math.max(0, args.windowMs - (ts - current.startMs));
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  current.count += 1;
  rateWindows.set(args.key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function acquireInFlightLease(args: {
  key: string;
  ttlMs: number;
}): boolean {
  const ts = nowMs();
  cleanupExpiredLeases(ts);
  const existing = leases.get(args.key);
  if (existing && existing.expiresAtMs > ts) {
    return false;
  }
  leases.set(args.key, { expiresAtMs: ts + args.ttlMs });
  return true;
}

export function releaseInFlightLease(key: string) {
  leases.delete(key);
}
