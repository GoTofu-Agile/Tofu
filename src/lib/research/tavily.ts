import { tavily } from "@tavily/core";
import { prisma } from "@/lib/db/prisma";
import type { DataSourceType } from "@prisma/client";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export interface ResearchResult {
  title: string;
  content: string;
  url: string;
  publishedDate?: string;
  score: number;
  domain: string;
  sourceType: DataSourceType;
}

function detectSourceType(url: string, domain: string): DataSourceType {
  if (domain.includes("reddit.com")) return "REDDIT";
  if (domain.includes("apps.apple.com") || domain.includes("apple.com/app"))
    return "APP_REVIEW";
  if (domain.includes("play.google.com")) return "PLAY_STORE_REVIEW";
  if (domain.includes("producthunt.com")) return "PRODUCT_HUNT";
  if (domain.includes("g2.com")) return "G2_REVIEW";
  if (domain.includes("trustpilot.com")) return "TRUSTPILOT";
  if (domain.includes("scholar.google") || domain.includes("arxiv.org"))
    return "ACADEMIC";
  if (
    domain.includes("twitter.com") ||
    domain.includes("x.com") ||
    domain.includes("linkedin.com")
  )
    return "SOCIAL_MEDIA";
  return "FORUM";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export async function searchTavily(
  query: string,
  options?: {
    includeDomains?: string[];
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
  }
): Promise<ResearchResult[]> {
  const response = await client.search(query, {
    maxResults: options?.maxResults ?? 10,
    searchDepth: options?.searchDepth ?? "advanced",
    includeDomains: options?.includeDomains,
  });

  return response.results.map((result) => {
    const domain = extractDomain(result.url);
    return {
      title: result.title,
      content: result.content,
      url: result.url,
      publishedDate: result.publishedDate,
      score: result.score,
      domain,
      sourceType: detectSourceType(result.url, domain),
    };
  });
}

export async function saveResearchResults(
  groupId: string,
  results: ResearchResult[],
  searchQuery: string,
  searchSession: string
) {
  const created = [];
  for (const result of results) {
    const record = await prisma.domainKnowledge.create({
      data: {
        personaGroupId: groupId,
        title: result.title,
        content: result.content,
        sourceType: result.sourceType,
        sourceUrl: result.url,
        sourceDomain: result.domain,
        publishedAt: result.publishedDate
          ? new Date(result.publishedDate)
          : null,
        relevanceScore: result.score,
        searchQuery,
        searchSession,
      },
    });
    created.push(record);
  }
  return created;
}
