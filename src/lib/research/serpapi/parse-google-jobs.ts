import type { SerpSnippetRow } from "./serp-snippet-row";

/**
 * SerpAPI `google_jobs` — `jobs_results`.
 */
export function rowsFromGoogleJobsJson(json: unknown): SerpSnippetRow[] {
  const obj = json as {
    jobs_results?: Array<{
      title?: string;
      company_name?: string;
      location?: string;
      via?: string;
      description?: string;
      share_link?: string;
      apply_options?: Array<{ title?: string; link?: string }>;
      extensions?: string[];
    }>;
  };
  const rows = obj.jobs_results ?? [];
  const out: SerpSnippetRow[] = [];
  for (const r of rows) {
    const title = (r.title ?? "").trim();
    if (!title) continue;
    const company = (r.company_name ?? "").trim();
    const loc = (r.location ?? "").trim();
    const via = (r.via ?? "").trim();
    const head = [company, loc, via ? `via ${via}` : ""].filter(Boolean).join(" · ");
    const ext = (r.extensions ?? []).slice(0, 6).join(" · ");
    const desc = (r.description ?? "").trim().slice(0, 1200);
    const content = [head, ext, desc].filter(Boolean).join("\n\n") || title;
    const applyLink = r.apply_options?.find((o) => (o.link ?? "").trim())?.link?.trim();
    const url = (r.share_link ?? "").trim() || applyLink || "";
    if (!url) continue;
    out.push({ title, content, url, publishedAt: null });
  }
  return out;
}
