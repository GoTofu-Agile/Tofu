import type { DataSourceType, SourceType } from "@prisma/client";

export type PersonaProvenanceKnowledge = {
  sourceType: DataSourceType;
  searchQuery: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
};

export type PersonaProvenanceDataSource = {
  domainKnowledge: PersonaProvenanceKnowledge;
};

/**
 * Short label for the persona detail badge, derived from linked DomainKnowledge
 * (Tavily sets searchQuery + sourceUrl) and review types.
 */
export function formatPersonaCreationProvenance(input: {
  sourceType: SourceType;
  dataSources?: PersonaProvenanceDataSource[] | null;
}): string {
  const rows = input.dataSources ?? [];
  let hasWebSearch = false;
  let hasUrlSource = false;
  let hasAppStoreReview = false;
  let hasPlayStoreReview = false;

  for (const ds of rows) {
    const dk = ds.domainKnowledge;
    if (!dk) continue;
    if (dk.searchQuery?.trim()) hasWebSearch = true;
    if (dk.sourceUrl?.trim()) hasUrlSource = true;
    if (dk.sourceType === "APP_REVIEW") hasAppStoreReview = true;
    if (dk.sourceType === "PLAY_STORE_REVIEW") hasPlayStoreReview = true;
  }

  const chunks: string[] = [];
  if (hasWebSearch && hasUrlSource) {
    chunks.push("Web research & scraped sources");
  } else if (hasWebSearch) {
    chunks.push("Web research");
  } else if (hasUrlSource) {
    chunks.push("Scraped web sources");
  }

  const storeLabels: string[] = [];
  if (hasAppStoreReview) storeLabels.push("App Store reviews");
  if (hasPlayStoreReview) storeLabels.push("Play Store reviews");
  if (storeLabels.length > 0) {
    chunks.push(storeLabels.join(" & "));
  }

  if (chunks.length > 0) {
    return chunks.join(" · ");
  }

  switch (input.sourceType) {
    case "PROMPT_GENERATED":
      return "Product context & AI";
    case "DATA_BASED":
      return "Research & data sources";
    case "UPLOAD_BASED":
      return "Uploaded documents";
    default:
      return "Product context & AI";
  }
}
