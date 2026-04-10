import type { SerpSnippetRow } from "./serp-snippet-row";

/**
 * SerpAPI `google_scholar` — `organic_results`.
 */
export function rowsFromGoogleScholarJson(json: unknown): SerpSnippetRow[] {
  const obj = json as {
    organic_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      publication_info?: { summary?: string };
      result_id?: string;
    }>;
  };
  const rows = obj.organic_results ?? [];
  const out: SerpSnippetRow[] = [];
  for (const r of rows) {
    const title = (r.title ?? "").trim();
    const link = (r.link ?? "").trim();
    if (!title || !link) continue;
    const snippet = (r.snippet ?? "").trim();
    const summary = (r.publication_info?.summary ?? "").trim();
    const content = snippet || summary || title;
    out.push({
      title,
      content,
      url: link,
      publishedAt: null,
      dedupeKey: r.result_id ? `scholar:${r.result_id}` : undefined,
    });
  }
  return out;
}
