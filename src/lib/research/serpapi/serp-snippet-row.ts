/** Normalized row before mapping to DomainKnowledge + optional dedupe key. */
export type SerpSnippetRow = {
  title: string;
  content: string;
  url: string;
  publishedAt: Date | null;
  /** When URL is missing or generic, use this for deduplication (e.g. place_id, video_id). */
  dedupeKey?: string;
};
