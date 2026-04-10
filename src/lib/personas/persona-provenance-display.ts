import type { DataSourceType, DomainKnowledge } from "@prisma/client";

const RESEARCH_TYPE_ORDER: DataSourceType[] = [
  "NEWS",
  "REDDIT",
  "FORUM",
  "TRUSTPILOT",
  "ACADEMIC",
  "SOCIAL_MEDIA",
  "MANUAL",
  "PRODUCT_HUNT",
  "G2_REVIEW",
];

export const DATA_SOURCE_TYPE_LABELS: Record<DataSourceType, string> = {
  NEWS: "News",
  REDDIT: "Reddit",
  FORUM: "Forum / Q&A",
  TRUSTPILOT: "Trustpilot",
  ACADEMIC: "Academic",
  SOCIAL_MEDIA: "Social & video",
  MANUAL: "Web & other",
  PRODUCT_HUNT: "Product Hunt",
  G2_REVIEW: "G2",
  APP_REVIEW: "App Store",
  PLAY_STORE_REVIEW: "Google Play",
};

export function labelForDataSourceType(t: DataSourceType): string {
  return DATA_SOURCE_TYPE_LABELS[t] ?? t;
}

export function excerptText(text: string, maxChars = 320): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

type DsWithDk = { domainKnowledge: DomainKnowledge };

/** Research rows linked to the persona (excludes store reviews; those have their own UI). */
export function researchKnowledgeFromDataSources(
  dataSources: DsWithDk[] | undefined
): DomainKnowledge[] {
  if (!dataSources?.length) return [];
  const out: DomainKnowledge[] = [];
  const seen = new Set<string>();
  for (const ds of dataSources) {
    const dk = ds.domainKnowledge;
    if (dk.sourceType === "APP_REVIEW" || dk.sourceType === "PLAY_STORE_REVIEW") continue;
    if (seen.has(dk.id)) continue;
    seen.add(dk.id);
    out.push(dk);
  }
  const orderIndex = (t: DataSourceType) => {
    const i = RESEARCH_TYPE_ORDER.indexOf(t);
    return i === -1 ? RESEARCH_TYPE_ORDER.length : i;
  };
  return out.sort((a, b) => {
    const ot = orderIndex(a.sourceType) - orderIndex(b.sourceType);
    if (ot !== 0) return ot;
    const da = a.publishedAt?.getTime() ?? 0;
    const db = b.publishedAt?.getTime() ?? 0;
    if (db !== da) return db - da;
    return a.title.localeCompare(b.title);
  });
}

/** Short provenance line from DomainKnowledge.metadata (e.g. Serp engine). */
export function provenanceHintFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (m.provider === "serpapi" && typeof m.serpEngine === "string") {
    parts.push(m.serpEngine.replace(/_/g, " "));
  } else if (typeof m.provider === "string") {
    parts.push(m.provider);
  }
  if (m.kind === "app_discovery") parts.push("app discovery");
  if (m.kind === "local_place") parts.push("local");
  if (m.kind === "job_listing") parts.push("jobs");
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
