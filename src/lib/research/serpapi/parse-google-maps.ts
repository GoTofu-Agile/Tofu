import type { SerpSnippetRow } from "./serp-snippet-row";

type LocalResult = {
  title?: string;
  place_id?: string;
  link?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  description?: string;
  reviews_link?: string;
  phone?: string;
  type?: string;
};

function rowFromLocal(r: LocalResult): SerpSnippetRow | null {
  const title = (r.title ?? "").trim();
  if (!title) return null;
  const parts: string[] = [];
  if (r.type) parts.push(String(r.type));
  if (r.address) parts.push(r.address);
  if (r.rating != null) parts.push(`Rating ${r.rating}${r.reviews != null ? ` (${r.reviews} reviews)` : ""}`);
  if (r.phone) parts.push(r.phone);
  if (r.description) parts.push(r.description.trim());
  const content = parts.filter(Boolean).join(" · ") || title;
  const url =
    (r.link ?? "").trim() ||
    (r.website ?? "").trim() ||
    (r.reviews_link ?? "").trim() ||
    (r.place_id
      ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(r.place_id)}`
      : "");
  if (!url && !r.place_id) return null;
  const dedupeKey = r.place_id ? `maps:place:${r.place_id}` : undefined;
  return {
    title,
    content,
    url: url || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(r.place_id!)}`,
    publishedAt: null,
    dedupeKey,
  };
}

/**
 * SerpAPI `google_maps` — `local_results` / single `place_results`.
 */
export function rowsFromGoogleMapsJson(json: unknown): SerpSnippetRow[] {
  const obj = json as {
    local_results?: LocalResult[];
    place_results?: LocalResult | LocalResult[];
  };
  const out: SerpSnippetRow[] = [];
  const locals = obj.local_results ?? [];
  for (const r of locals) {
    const row = rowFromLocal(r);
    if (row) out.push(row);
  }
  const pr = obj.place_results;
  if (pr) {
    const list = Array.isArray(pr) ? pr : [pr];
    for (const r of list) {
      const row = rowFromLocal(r);
      if (row) out.push(row);
    }
  }
  return out;
}
