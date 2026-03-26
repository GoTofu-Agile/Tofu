import type { DomainKnowledge, PersonaDataSource } from "@prisma/client";

export type AppStoreReviewSnippet = {
  id: string;
  content: string;
  title: string;
  rating: number | null;
  sourceUrl: string | null;
  reviewUrl: string | null;
};

type DomainKnowledgeForSnippet = Pick<
  DomainKnowledge,
  "id" | "content" | "title" | "metadata" | "sourceUrl" | "sourceType"
>;

type DataSourceWithKnowledge = Pick<
  PersonaDataSource,
  "id" | "personaId" | "domainKnowledgeId" | "influence"
> & {
  domainKnowledge: DomainKnowledgeForSnippet;
};

export function appStoreReviewSnippetsFromPersona(
  dataSources: DataSourceWithKnowledge[] | undefined
): AppStoreReviewSnippet[] {
  if (!dataSources?.length) return [];
  return dataSources
    .filter((ds) => ds.domainKnowledge.sourceType === "APP_REVIEW")
    .map((ds) => {
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
      };
    });
}
