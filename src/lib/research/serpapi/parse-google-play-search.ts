import type { SerpSnippetRow } from "./serp-snippet-row";

type PlayItem = {
  title?: string;
  link?: string;
  product_id?: string;
  description?: string;
  author?: string;
  category?: string;
  rating?: number;
  downloads?: string;
};

function collectItemsFromOrganic(organic: unknown): PlayItem[] {
  if (!Array.isArray(organic)) return [];
  const items: PlayItem[] = [];
  for (const section of organic) {
    const s = section as { items?: PlayItem[]; title?: string };
    if (Array.isArray(s.items)) {
      items.push(...s.items);
    }
  }
  return items;
}

/**
 * SerpAPI `google_play` with `q` — organic sections with nested `items`.
 */
export function rowsFromGooglePlaySearchJson(json: unknown): SerpSnippetRow[] {
  const obj = json as { organic_results?: unknown[] };
  const flat = collectItemsFromOrganic(obj.organic_results ?? []);
  const out: SerpSnippetRow[] = [];
  for (const r of flat) {
    const title = (r.title ?? "").trim();
    const link = (r.link ?? "").trim();
    if (!title || !link) continue;
    const desc = (r.description ?? "").trim().slice(0, 1500);
    const head = [r.author, r.category, r.downloads, r.rating != null ? `★ ${r.rating}` : ""]
      .filter(Boolean)
      .join(" · ");
    const content = [head, desc].filter(Boolean).join("\n\n") || title;
    out.push({
      title,
      content,
      url: link,
      publishedAt: null,
      dedupeKey: r.product_id ? `play:${r.product_id}` : undefined,
    });
  }
  return out;
}
