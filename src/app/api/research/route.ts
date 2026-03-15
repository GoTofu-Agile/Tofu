import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import {
  searchTavily,
  saveResearchResults,
} from "@/lib/research/tavily";
import { buildSearchQueries, type ProductInfo } from "@/lib/research/build-queries";

const requestSchema = z.object({
  groupId: z.string().min(1),
  productInfo: z.object({
    productName: z.string().min(1),
    oneLiner: z.string().min(1),
    targetAudience: z.string().min(1),
    competitors: z.array(z.string()).default([]),
    researchGoals: z.array(z.string()).default([]),
  }),
});

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const dbUser = await getUser(authUser.id);
  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 401 });
  }

  // Validate
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify access
  const group = await getPersonaGroup(body.groupId);
  if (!group) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }
  const role = await getUserRole(group.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  // Check if Tavily is configured
  if (!process.env.TAVILY_API_KEY) {
    return Response.json({
      type: "done",
      totalResults: 0,
      message: "Web research is disabled (no TAVILY_API_KEY). Personas will be generated from your product description.",
    });
  }

  // Build search queries from product info
  const queries = buildSearchQueries(body.productInfo);
  const searchSession = crypto.randomUUID();

  // Stream results as NDJSON
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let totalResults = 0;

      for (let i = 0; i < queries.length; i++) {
        const plan = queries[i];

        // Send progress
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "searching",
              current: i + 1,
              total: queries.length,
              label: plan.label,
            }) + "\n"
          )
        );

        try {
          const results = await searchTavily(plan.query, {
            includeDomains: plan.includeDomains,
            maxResults: 5,
            searchDepth: "advanced",
          });

          // Save to DB
          const saved = await saveResearchResults(
            body.groupId,
            results,
            plan.query,
            searchSession
          );

          totalResults += saved.length;

          // Send results
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "results",
                queryLabel: plan.label,
                count: saved.length,
                results: saved.map((r) => ({
                  id: r.id,
                  title: r.title,
                  sourceType: r.sourceType,
                  sourceDomain: r.sourceDomain,
                  sourceUrl: r.sourceUrl,
                  publishedAt: r.publishedAt,
                  relevanceScore: r.relevanceScore,
                })),
              }) + "\n"
            )
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                queryLabel: plan.label,
                message:
                  error instanceof Error ? error.message : "Search failed",
              }) + "\n"
            )
          );
        }
      }

      // Done
      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            type: "done",
            totalResults,
            searchSession,
          }) + "\n"
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
