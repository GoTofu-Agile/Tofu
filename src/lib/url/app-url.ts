const FALLBACK_PROD_URL = "https://app.gotofu.io";

function isLocalhostHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local");
}

function isUsableEnvUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    if (process.env.NODE_ENV === "production" && isLocalhostHost(u.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getRequestOrigin(headers: Headers): string | null {
  const forwardedHost = headers.get("x-forwarded-host");
  const forwardedProto = headers.get("x-forwarded-proto");
  const host = forwardedHost ?? headers.get("host");
  if (!host) return null;
  const hostname = host.split(":")[0] ?? host;
  const proto = forwardedProto ?? (isLocalhostHost(hostname) ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function resolveAppBaseUrl(headers?: Headers): string {
  if (headers) {
    const origin = getRequestOrigin(headers);
    if (origin) {
      try {
        const u = new URL(origin);
        if (process.env.NODE_ENV !== "production" || !isLocalhostHost(u.hostname)) {
          return origin;
        }
      } catch {
      }
    }
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (isUsableEnvUrl(fromEnv)) return fromEnv;
  if (process.env.NODE_ENV !== "production" && fromEnv) return fromEnv;
  return FALLBACK_PROD_URL;
}
