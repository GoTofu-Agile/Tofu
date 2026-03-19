import { prisma } from "@/lib/db/prisma";
import type { DomainKnowledge } from "@prisma/client";

/**
 * Rows written by Outscraper via POST /api/reviews/appstore use:
 * - `searchQuery`: `appstore:<appUrl>`
 * - `metadata.reviewUrl`: Outscraper review link
 *
 * Tavily or other ingest may create APP_REVIEW rows without this shape; those are
 * excluded from persona “verbatim App Store review” UI unless you widen this filter.
 */
export function isOutscraperAppStoreReviewRow(row: {
  searchQuery: string | null;
  metadata: unknown;
}): boolean {
  if (row.searchQuery?.startsWith("appstore:")) return true;
  const m = row.metadata as Record<string, unknown> | null | undefined;
  return typeof m?.reviewUrl === "string" && m.reviewUrl.length > 0;
}

/** Crawled App Store reviews for a group (Outscraper-backed only). */
export async function loadOutscraperAppReviewsForGroup(
  groupId: string,
  options?: { take?: number }
): Promise<DomainKnowledge[]> {
  const take = options?.take ?? 250;
  const rows = await prisma.domainKnowledge.findMany({
    where: {
      personaGroupId: groupId,
      sourceType: "APP_REVIEW",
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
  return rows.filter(isOutscraperAppStoreReviewRow);
}
