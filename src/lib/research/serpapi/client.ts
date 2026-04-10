const SERPAPI_SEARCH_JSON = "https://serpapi.com/search.json";

export function isSerpApiConfigured(): boolean {
  if (process.env.SERPAPI_ENABLED === "false") return false;
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

/** Upper bound for supplemental quick-research Serp calls (each engine request = 1 call). */
export function getSerpApiMaxCallsPerRequest(): number {
  const raw = process.env.SERPAPI_MAX_CALLS_PER_REQUEST;
  const n = raw ? Number.parseInt(raw, 10) : 8;
  if (!Number.isFinite(n) || n < 1) return 8;
  return Math.min(n, 50);
}

/**
 * Single SerpAPI JSON request. Never logs the API key.
 */
export async function serpGet(
  params: Record<string, string | number | boolean | undefined>
): Promise<unknown> {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not set. Add it to .env.local.");
  }

  const url = new URL(SERPAPI_SEARCH_JSON);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("api_key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`SerpAPI returned non-JSON (HTTP ${res.status})`);
    }

    const obj = json as {
      error?: string;
      search_metadata?: { status?: string };
    };

    if (!res.ok) {
      throw new Error(obj.error || `SerpAPI HTTP ${res.status}`);
    }
    // SerpAPI often sets `error` to a human message when a vertical has zero hits (still HTTP 200).
    if (obj.search_metadata?.status === "Error" || obj.error) {
      const errText = String(obj.error ?? "");
      const benignEmpty =
        /hasn't returned any results|has not returned any results|no results found/i.test(errText);
      if (benignEmpty) {
        return json;
      }
      throw new Error(errText || "SerpAPI search failed");
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}
