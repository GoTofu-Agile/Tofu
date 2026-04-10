import type { SerpSnippetRow } from "./serp-snippet-row";

/**
 * SerpAPI `apple_app_store` — `organic_results` (search).
 */
export function rowsFromAppleAppStoreSearchJson(json: unknown): SerpSnippetRow[] {
  const obj = json as {
    organic_results?: Array<{
      title?: string;
      link?: string;
      description?: string;
      id?: number;
      bundle_id?: string;
      rating?: Array<{ rating?: number; count?: number }>;
    }>;
  };
  const rows = obj.organic_results ?? [];
  const out: SerpSnippetRow[] = [];
  for (const r of rows) {
    const title = (r.title ?? "").trim();
    const link = (r.link ?? "").trim();
    if (!title || !link) continue;
    const desc = (r.description ?? "").trim().slice(0, 1500);
    const rating = r.rating?.[0];
    const ratingBit =
      rating?.rating != null
        ? `Rating ${rating.rating}${rating.count != null ? ` (${rating.count} ratings)` : ""}`
        : "";
    const content = [ratingBit, r.bundle_id ? `Bundle ${r.bundle_id}` : "", desc].filter(Boolean).join("\n") || title;
    out.push({
      title,
      content,
      url: link,
      publishedAt: null,
      dedupeKey: r.id != null ? `apple_app:${r.id}` : undefined,
    });
  }
  return out;
}
