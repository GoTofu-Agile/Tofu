import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { extractedContextSchema } from "@/lib/validation/schemas";
import { tavily } from "@tavily/core";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const dbUser = await getUser(authUser.id);
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 401 });

  const body = await request.json();
  const url: string = body.url;
  if (!url || !url.startsWith("http")) {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return Response.json({ error: "TAVILY_API_KEY not set" }, { status: 500 });

  const client = tavily({ apiKey });

  // Fetch the page + related company context via Tavily
  let companyContext = "";
  try {
    const [pageResult, searchResult] = await Promise.all([
      client.extract([url]).catch(() => null),
      client.search(`company overview target users ${url}`, {
        maxResults: 3,
        searchDepth: "basic",
      }).catch(() => null),
    ]);

    const parts: string[] = [];
    if (pageResult?.results?.[0]?.rawContent) {
      parts.push(`Page content:\n${pageResult.results[0].rawContent.slice(0, 3000)}`);
    }
    if (searchResult?.results?.length) {
      const snippets = searchResult.results.map((r) => `${r.title}: ${r.content}`).join("\n");
      parts.push(`Related context:\n${snippets}`);
    }
    companyContext = parts.join("\n\n");
  } catch {
    return Response.json({ error: "Could not fetch URL content" }, { status: 400 });
  }

  if (!companyContext.trim()) {
    return Response.json({ error: "Could not extract content from URL" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: getModel(),
    schema: extractedContextSchema,
    prompt: `You are helping create synthetic personas based on a company's website and context.

Company URL: ${url}

Scraped content:
${companyContext.slice(0, 5000)}

Based on this company, extract a target user persona:
- groupName: A descriptive name for the group of people who would use this company's product/service
- targetUserRole: The primary role/type of user of this product
- industry: The industry this company operates in
- painPoints: 3-5 pain points that their target users likely have (that this product addresses)
- demographicsHints: Inferred demographic info about their typical users
- domainContext: A rich paragraph describing the target user type for this company — their background, challenges, motivations, and why they would use this product.`,
  });

  return Response.json(object);
}
