import { z } from "zod";

const DEFAULT_BASE_URL = "https://api.outscraper.cloud";
const FALLBACK_BASE_URLS = ["https://api.app.outscraper.com"];

const ReviewSchema = z
  .object({
    title: z.string().optional(),
    text: z.string().optional(),
    review: z.string().optional(),
    rating: z.number().optional(),
    date: z.string().optional(),
    userName: z.string().optional(),
    version: z.string().optional(),
    country: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

const ReviewItemSchema = z.union([ReviewSchema, z.array(ReviewSchema)]);

const OutscraperResponseSchema = z
  .union([
    z.object({ data: z.array(ReviewItemSchema) }).passthrough(),
    z.array(ReviewItemSchema),
  ])
  ;

export type OutscraperAppStoreReview = z.infer<typeof ReviewSchema>;

function getBaseUrls() {
  const configured = process.env.OUTSCRAPER_API_BASE_URL;
  if (configured) return [configured];
  return [DEFAULT_BASE_URL, ...FALLBACK_BASE_URLS];
}

function getApiKey() {
  const key = process.env.OUTSCRAPER_API_KEY;
  if (!key) {
    throw new Error("OUTSCRAPER_API_KEY is not set. Add it to .env.local.");
  }
  return key;
}

/**
 * Fetch App Store reviews for a given App Store URL.
 *
 * Outscraper Node SDK uses: GET /appstore/reviews?query=<url>&limit=<n>
 */
export async function fetchAppStoreReviews(params: {
  appUrl: string;
  limit?: number;
  sort?: string;
  cutoff?: string | null;
  fields?: string;
}): Promise<OutscraperAppStoreReview[]> {
  const baseUrls = getBaseUrls();
  const apiKey = getApiKey();

  const candidates = [
    "/appstore-reviews", // shown in your docs UI screenshots
    "/appstore/reviews", // used by Outscraper Node SDK
  ];

  let lastError: unknown = null;

  for (const baseUrl of baseUrls) {
    for (const path of candidates) {
      const url = new URL(path, baseUrl);
      url.searchParams.set("query", params.appUrl);
      url.searchParams.set("limit", String(params.limit ?? 100));
      url.searchParams.set("async", "false");
      if (params.sort) url.searchParams.set("sort", params.sort);
      if (params.cutoff) url.searchParams.set("cutoff", params.cutoff);
      if (params.fields) url.searchParams.set("fields", params.fields);

      try {
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-API-KEY": apiKey,
            client: "gotofu",
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          lastError = new Error(
            `Outscraper request failed (${res.status}) for ${url.pathname}: ${
              text || res.statusText
            }`
          );
          continue;
        }

        let json: unknown;
        try {
          json = await res.json();
        } catch (e) {
          lastError = e;
          continue;
        }
        const parsed = OutscraperResponseSchema.safeParse(json);
        if (!parsed.success) {
          lastError = new Error(
            `Unexpected Outscraper response shape for ${url.pathname}`
          );
          continue;
        }

        const data = Array.isArray(parsed.data) ? parsed.data : parsed.data.data;
        const flat = (data as Array<OutscraperAppStoreReview | OutscraperAppStoreReview[]>).flatMap(
          (item) => (Array.isArray(item) ? item : [item])
        );
        return flat.map((r: OutscraperAppStoreReview) => ({
          ...r,
          text: r.text ?? r.review,
        }));
      } catch (e) {
        lastError = e;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Outscraper request failed");
}

