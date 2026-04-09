import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { extractedContextSchema } from "@/lib/validation/schemas";
import { tavily } from "@tavily/core";

function normalizeCompanyUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function hostnameWithoutWww(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

function guessCompanyNameFromDomain(domain: string): string {
  const root = domain.split(".")[0] ?? domain;
  return root
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const dbUser = await getUser(authUser.id);
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 401 });

  const body = await request.json();
  const url: string = body.url;
  const parsedUrl = normalizeCompanyUrl(url);
  if (!parsedUrl) {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
  const companyDomain = hostnameWithoutWww(parsedUrl.hostname);

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return Response.json({ error: "TAVILY_API_KEY not set" }, { status: 500 });

  const client = tavily({ apiKey });

  // Fetch first-party company pages and user-evidence pages via Tavily
  let companyContext = "";
  let extractedPagesCount = 0;
  let evidenceMentionsCount = 0;
  try {
    const [pageResult, profileSearch, testimonialSearch, caseStudySearch] = await Promise.all([
      client.extract([url]).catch((err) => {
        console.warn("[extract-url] Tavily extract failed:", err);
        return null;
      }),
      client.search(`site:${companyDomain} about team leadership customers users`, {
        maxResults: 5,
        searchDepth: "advanced",
      }).catch((err) => {
        console.warn("[extract-url] Tavily profile search failed:", err);
        return null;
      }),
      client.search(`site:${companyDomain} testimonial review customer story`, {
        maxResults: 5,
        searchDepth: "advanced",
      }).catch((err) => {
        console.warn("[extract-url] Tavily testimonial search failed:", err);
        return null;
      }),
      client.search(`site:${companyDomain} case study customer success persona`, {
        maxResults: 5,
        searchDepth: "basic",
      }).catch((err) => {
        console.warn("[extract-url] Tavily case study search failed:", err);
        return null;
      }),
    ]);

    const parts: string[] = [];
    const candidateUrls = new Set<string>();

    if (pageResult?.results?.[0]?.rawContent) {
      parts.push(`Page content:\n${pageResult.results[0].rawContent.slice(0, 3000)}`);
      extractedPagesCount += 1;
    }

    for (const search of [profileSearch, testimonialSearch, caseStudySearch]) {
      for (const result of search?.results ?? []) {
        try {
          const host = hostnameWithoutWww(new URL(result.url).hostname);
          if (host === companyDomain) {
            candidateUrls.add(result.url);
          }
        } catch {
          // Ignore malformed URLs
        }
      }
    }

    const urlsToExtract = Array.from(candidateUrls).slice(0, 6);
    if (urlsToExtract.length > 0) {
      const extractedRelated = await client.extract(urlsToExtract).catch((err) => {
        console.warn("[extract-url] Tavily related extract failed:", err);
        return null;
      });

      for (const row of extractedRelated?.results ?? []) {
        const content = (row.rawContent ?? "").slice(0, 2200);
        if (!content) continue;
        extractedPagesCount += 1;
        const mentionHits =
          (content.match(
            /\b(customer|user|client|persona|testimon|case study|review|buyer|founder|manager|engineer|nurse|teacher)\b/gi
          )?.length ?? 0);
        evidenceMentionsCount += mentionHits;
        parts.push(`Evidence page (${row.url}):\n${content}`);
      }
    }

    const summarySnippets = [
      ...(profileSearch?.results ?? []),
      ...(testimonialSearch?.results ?? []),
      ...(caseStudySearch?.results ?? []),
    ]
      .slice(0, 8)
      .map((r) => `- ${r.title} (${r.url}): ${r.content}`)
      .join("\n");
    if (summarySnippets) {
      parts.push(`Search snippets:\n${summarySnippets}`);
    }
    companyContext = parts.join("\n\n");
  } catch {
    return Response.json({ error: "Could not fetch URL content" }, { status: 400 });
  }

  if (!companyContext.trim()) {
    return Response.json({ error: "Could not extract content from URL" }, { status: 400 });
  }
  if (extractedPagesCount < 2 || evidenceMentionsCount < 3) {
    // Fallback: search outside the website for user/customer evidence tied to the company.
    const companyName = guessCompanyNameFromDomain(companyDomain);
    const fallbackQueries = [
      `"${companyName}" user reviews customer experiences`,
      `"${companyName}" G2 Trustpilot Capterra Product Hunt reviews`,
      `"${companyName}" reddit users feedback`,
      `"${companyName}" case study customer story`,
      `"${companyName}" target users buyer persona`,
    ];

    const fallbackSearches = await Promise.all(
      fallbackQueries.map((query) =>
        client
          .search(query, { maxResults: 5, searchDepth: "advanced" })
          .catch((err) => {
            console.warn("[extract-url] Tavily fallback search failed:", err);
            return null;
          })
      )
    );

    const fallbackSnippets: string[] = [];
    let fallbackEvidenceMentions = 0;
    for (const search of fallbackSearches) {
      for (const result of search?.results ?? []) {
        const line = `${result.title} (${result.url}): ${result.content}`;
        fallbackSnippets.push(line);
        fallbackEvidenceMentions +=
          (line.match(
            /\b(customer|user|client|review|testimon|case study|buyer|persona|feedback|founder|manager|engineer|nurse|teacher)\b/gi
          )?.length ?? 0);
      }
    }

    if (fallbackSnippets.length === 0 || fallbackEvidenceMentions < 4) {
      return Response.json(
        {
          error:
            "Could not find enough user-related evidence on this site or external sources. Please provide a more specific company URL, target segment, or product context.",
        },
        { status: 422 }
      );
    }

    companyContext = [
      companyContext,
      `External user evidence for ${companyName}:\n${fallbackSnippets
        .slice(0, 12)
        .map((s) => `- ${s}`)
        .join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: extractedContextSchema,
      prompt: `You are helping create research personas from a company website.

Company URL: ${url}
Company domain: ${companyDomain}

Evidence corpus (first-party pages and snippets):
${companyContext.slice(0, 5000)}

Rules (strict):
- Use only evidence present in the corpus; do not invent facts, titles, or segments.
- Focus on real user/customer profiles associated with this company and product.
- If the corpus is weak for any field, keep it general and conservative.

Extract:
- groupName: A descriptive name for the group of people who would use this company's product/service
- targetUserRole: The primary role/type of user of this product
- industry: The industry this company operates in
- painPoints: 3-5 pain points that their target users likely have (that this product addresses)
- demographicsHints: Inferred demographic info about their typical users
- domainContext: A rich paragraph describing the target users tied to evidence. Include "Source website: ${url}" and mention observed evidence patterns from testimonials/case studies/users if present.`,
    });

    return Response.json(object);
  } catch (error) {
    console.error("[extract-url] AI generation failed:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze URL content";
    return Response.json({ error: message }, { status: 500 });
  }
}
