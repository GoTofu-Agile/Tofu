import { tavily } from "@tavily/core";
import { prisma } from "@/lib/db/prisma";
import type { DataSourceType } from "@prisma/client";

function getClient() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is not set. Add it to .env.local to enable web research. Personas will still be generated from your product description."
    );
  }
  return tavily({ apiKey });
}

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
  const client = getClient();
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

/**
 * Quick research: runs 1-2 targeted Tavily queries and saves results.
 * Used by Quick Prompt and Manual creation methods for auto-research.
 * Returns the number of results found.
 */
export async function quickResearch(
  groupId: string,
  queries: string[]
): Promise<{ totalResults: number; error?: string }> {
  if (!process.env.TAVILY_API_KEY) {
    return { totalResults: 0 };
  }

  const searchSession = crypto.randomUUID();
  let totalResults = 0;

  for (const query of queries.slice(0, 3)) {
    try {
      const results = await searchTavily(query, {
        maxResults: 5,
        searchDepth: "advanced",
      });
      const saved = await saveResearchResults(
        groupId,
        results,
        query,
        searchSession
      );
      totalResults += saved.length;
    } catch (error) {
      console.error(`[quickResearch] Query failed: ${query}`, error);
    }
  }

  return { totalResults };
}

/**
 * Build auto-research queries from a quick prompt or manual form input.
 */
export function buildAutoQueries(input: {
  prompt?: string;
  role?: string;
  industry?: string;
  painPoints?: string;
}): string[] {
  const queries: string[] = [];

  if (input.prompt) {
    // Quick prompt: use the prompt directly + a pain points variant
    queries.push(`${input.prompt} user experience pain points frustrations`);
    queries.push(`${input.prompt} daily workflow challenges reddit`);
  } else if (input.role) {
    // Manual form: build from structured fields
    const context = [input.role, input.industry].filter(Boolean).join(" ");
    queries.push(`${context} user pain points frustrations challenges`);
    if (input.painPoints) {
      queries.push(`${context} ${input.painPoints.slice(0, 100)}`);
    } else {
      queries.push(`${context} daily workflow tools experience reddit`);
    }
  }

  return queries;
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
