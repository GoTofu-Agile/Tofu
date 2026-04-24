import { serpGet } from "./client";
import {
  extractAppleAppStoreProductId,
  extractGooglePlayProductId,
  isAppleAppStoreUrl,
  isGooglePlayStoreUrl,
  type StoreLocale,
} from "./store-url";

/** Normalized row for /api/reviews/appstore persistence. */
export type SerpStoreReview = {
  text: string;
  title?: string;
  rating?: number;
  date?: string | null;
  userName?: string;
  version?: string;
  country?: string;
  /** Optional permalink or stable id reference for metadata. */
  url?: string;
  serpReviewId?: string;
};

function parseAppleReviewDate(s: string | undefined): string | null {
  if (!s?.trim()) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

/** Fetch Apple App Store reviews via SerpAPI `apple_reviews` engine. */
export async function fetchAppleReviewsViaSerpApi(params: {
  appUrl: string;
  limit: number;
  locale?: StoreLocale;
}): Promise<SerpStoreReview[]> {
  const productId = extractAppleAppStoreProductId(params.appUrl);
  if (!productId) {
    throw new Error("Could not parse Apple App Store product id from URL");
  }

  const out: SerpStoreReview[] = [];
  let page = 1;

  while (out.length < params.limit) {
    const json = (await serpGet({
      engine: "apple_reviews",
      product_id: productId,
      page,
      sort: "mostrecent",
      // Best effort storefront targeting (derived from URL locale).
      country: params.locale?.country,
    })) as {
      reviews?: Array<{
        id?: string;
        title?: string;
        text?: string;
        rating?: number;
        review_date?: string;
        reviewed_version?: string;
        author?: { name?: string };
      }>;
      serpapi_pagination?: { next?: string };
    };

    const batch = json.reviews ?? [];
    if (batch.length === 0) break;

    for (const r of batch) {
      const text = (r.text ?? "").trim();
      if (!text) continue;
      const title = (r.title ?? "App Store review").trim();
      out.push({
        text,
        title,
        rating: typeof r.rating === "number" ? r.rating : undefined,
        date: parseAppleReviewDate(r.review_date) ?? r.review_date ?? null,
        userName: r.author?.name,
        version: r.reviewed_version,
        serpReviewId: r.id,
      });
      if (out.length >= params.limit) break;
    }

    if (out.length >= params.limit) break;
    if (!json.serpapi_pagination?.next) break;
    page += 1;
    if (page > 40) break;
  }

  return out.slice(0, params.limit);
}

/** Fetch Google Play reviews via SerpAPI `google_play_product` + `all_reviews`. */
export async function fetchGooglePlayReviewsViaSerpApi(params: {
  appUrl: string;
  limit: number;
  locale?: StoreLocale;
}): Promise<SerpStoreReview[]> {
  const productId = extractGooglePlayProductId(params.appUrl);
  if (!productId) {
    throw new Error("Could not parse Google Play app id from URL");
  }

  const out: SerpStoreReview[] = [];
  let nextPageToken: string | undefined;

  while (out.length < params.limit) {
    const pageSize = Math.min(199, params.limit - out.length);
    const query: Record<string, string | number | boolean | undefined> = {
      engine: "google_play_product",
      store: "apps",
      product_id: productId,
      // Prefer URL-derived locale; fall back to historical defaults.
      hl: params.locale?.language ?? "en",
      gl: params.locale?.country ?? "us",
      all_reviews: true,
      num: pageSize,
      sort_by: 2,
    };
    if (nextPageToken) {
      query.next_page_token = nextPageToken;
    }

    const json = (await serpGet(query)) as {
      reviews?: Array<{
        id?: string;
        title?: string;
        snippet?: string;
        rating?: number;
        iso_date?: string;
        date?: string;
      }>;
      serpapi_pagination?: { next_page_token?: string };
    };

    const batch = json.reviews ?? [];
    if (batch.length === 0) break;

    for (const r of batch) {
      const text = (r.snippet ?? "").trim();
      if (!text) continue;
      const author = (r.title ?? "Play Store user").trim();
      out.push({
        text,
        title: `Review — ${author}`,
        rating: typeof r.rating === "number" ? r.rating : undefined,
        date: r.iso_date ?? null,
        userName: author,
        url: params.appUrl,
        serpReviewId: r.id,
      });
      if (out.length >= params.limit) break;
    }

    nextPageToken = json.serpapi_pagination?.next_page_token;
    if (!nextPageToken || out.length >= params.limit) break;
    if (out.length === 0) break;
  }

  return out.slice(0, params.limit);
}

export async function fetchStoreReviewsViaSerpApi(params: {
  appUrl: string;
  limit: number;
  locale?: StoreLocale;
}): Promise<SerpStoreReview[]> {
  if (isGooglePlayStoreUrl(params.appUrl)) {
    return fetchGooglePlayReviewsViaSerpApi(params);
  }
  if (isAppleAppStoreUrl(params.appUrl)) {
    return fetchAppleReviewsViaSerpApi(params);
  }
  throw new Error(
    "Unsupported store URL. Use an Apple App Store or Google Play app details URL."
  );
}
