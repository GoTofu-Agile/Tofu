import type { DomainKnowledge } from "@prisma/client";

export type AppStoreReviewSnippet = {
  id: string;
  content: string;
  title: string;
  rating: number | null;
  sourceUrl: string | null;
  reviewUrl: string | null;
  /** For ordering alongside research snippets in a single sources list. */
  publishedAt: Date | null;
};

/** Any row that includes joined DomainKnowledge (list or detail query). */
export type DataSourceWithKnowledge = { domainKnowledge: DomainKnowledge };

function storeReviewSnippetFromDs(
  ds: DataSourceWithKnowledge,
  sourceType: "APP_REVIEW" | "PLAY_STORE_REVIEW"
): AppStoreReviewSnippet | null {
  if (ds.domainKnowledge.sourceType !== sourceType) return null;
  const dk = ds.domainKnowledge;
  const meta = dk.metadata as Record<string, unknown> | null;
  const rating = typeof meta?.rating === "number" ? meta.rating : null;
  const reviewUrl = typeof meta?.reviewUrl === "string" ? meta.reviewUrl : null;
  return {
    id: dk.id,
    content: dk.content,
    title: dk.title,
    rating,
    sourceUrl: dk.sourceUrl,
    reviewUrl,
    publishedAt: dk.publishedAt,
  };
}

export function appStoreReviewSnippetsFromPersona(
  dataSources: DataSourceWithKnowledge[] | undefined
): AppStoreReviewSnippet[] {
  if (!dataSources?.length) return [];
  return dataSources
    .map((ds) => storeReviewSnippetFromDs(ds, "APP_REVIEW"))
    .filter((x): x is AppStoreReviewSnippet => x != null);
}

export function playStoreReviewSnippetsFromPersona(
  dataSources: DataSourceWithKnowledge[] | undefined
): AppStoreReviewSnippet[] {
  if (!dataSources?.length) return [];
  return dataSources
    .map((ds) => storeReviewSnippetFromDs(ds, "PLAY_STORE_REVIEW"))
    .filter((x): x is AppStoreReviewSnippet => x != null);
}
