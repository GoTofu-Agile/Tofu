import type { SerpSnippetRow } from "./serp-snippet-row";

/**
 * SerpAPI `youtube` — `video_results`.
 */
export function rowsFromYoutubeJson(json: unknown): SerpSnippetRow[] {
  const obj = json as {
    video_results?: Array<{
      title?: string;
      link?: string;
      video_id?: string;
      description?: string;
      channel?: { name?: string };
      published_date?: string;
      views?: number;
      length?: string;
    }>;
  };
  const rows = obj.video_results ?? [];
  const out: SerpSnippetRow[] = [];
  for (const r of rows) {
    const title = (r.title ?? "").trim();
    const link = (r.link ?? "").trim();
    if (!title || !link) continue;
    const channel = r.channel?.name ? `Channel: ${r.channel.name}` : "";
    const meta = [r.length ? `Length ${r.length}` : "", r.views != null ? `${r.views} views` : "", r.published_date ?? ""]
      .filter(Boolean)
      .join(" · ");
    const desc = (r.description ?? "").trim();
    const content = [desc, channel, meta].filter(Boolean).join("\n") || title;
    out.push({
      title,
      content,
      url: link,
      publishedAt: null,
      dedupeKey: r.video_id ? `yt:${r.video_id}` : undefined,
    });
  }
  return out;
}
