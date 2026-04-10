import { prisma } from "@/lib/db/prisma";
import type { DomainKnowledge } from "@prisma/client";

/**
 * Structured store reviews loaded via POST /api/reviews/appstore (SerpAPI):
 * - `searchQuery`: `appstore:<url>` or `playstore:<url>`
 * - `metadata.provider`: `serpapi`
 */
export function isStructuredStoreReviewRow(row: {
  searchQuery: string | null;
  metadata: unknown;
}): boolean {
  if (row.searchQuery?.startsWith("appstore:")) return true;
  if (row.searchQuery?.startsWith("playstore:")) return true;
  const m = row.metadata as Record<string, unknown> | null | undefined;
  if (m?.provider === "serpapi") return true;
  return typeof m?.reviewUrl === "string" && m.reviewUrl.length > 0;
}

/** App Store / Play Store review snippets suitable for verbatim persona attribution. */
export async function loadStructuredStoreReviewsForGroup(
  groupId: string,
  options?: { take?: number }
): Promise<DomainKnowledge[]> {
  const take = options?.take ?? 250;
  const rows = await prisma.domainKnowledge.findMany({
    where: {
      personaGroupId: groupId,
      OR: [
        {
          sourceType: "APP_REVIEW",
          searchQuery: { startsWith: "appstore:" },
        },
        {
          sourceType: "PLAY_STORE_REVIEW",
          searchQuery: { startsWith: "playstore:" },
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
  return rows.filter(isStructuredStoreReviewRow);
}
