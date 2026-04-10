import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { quickResearch, buildAutoQueries } from "@/lib/research/tavily";
import { serpPersonaSupplement } from "@/lib/research/serpapi/persona-supplement";
import { serpSupplementOptionsSchema } from "@/lib/research/serpapi/serp-supplement-options";

const requestSchema = z.object({
  groupId: z.string().min(1),
  prompt: z.string().optional(),
  role: z.string().optional(),
  industry: z.string().optional(),
  painPoints: z.string().optional(),
  serpOptions: serpSupplementOptionsSchema.optional(),
});

export async function POST(request: NextRequest) {
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

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const group = await getPersonaGroup(body.groupId);
  if (!group) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }
  const role = await getUserRole(group.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const queries = buildAutoQueries({
    prompt: body.prompt,
    role: body.role,
    industry: body.industry,
    painPoints: body.painPoints,
  });

  if (queries.length === 0) {
    return Response.json({ totalResults: 0 });
  }

  const searchSession = crypto.randomUUID();

  const [tavilyResult, serpResult] = await Promise.allSettled([
    quickResearch(body.groupId, queries),
    serpPersonaSupplement(body.groupId, queries, searchSession, body.serpOptions),
  ]);

  let tavilyTotal = 0;
  let tavilyBySourceType: Record<string, number> = {};
  if (tavilyResult.status === "fulfilled") {
    tavilyTotal = tavilyResult.value.totalResults;
    tavilyBySourceType = tavilyResult.value.bySourceType as Record<string, number>;
  } else {
    console.error("[research/quick] Tavily failed:", tavilyResult.reason);
  }

  if (serpResult.status === "rejected") {
    console.error("[research/quick] SerpAPI supplement failed:", serpResult.reason);
  }

  const serpSaved =
    serpResult.status === "fulfilled" ? serpResult.value.totalSaved : 0;
  const serpByEngine =
    serpResult.status === "fulfilled" ? serpResult.value.serpByEngine : {};

  return Response.json({
    totalResults: tavilyTotal + serpSaved,
    tavilyResults: tavilyTotal,
    serpResults: serpSaved,
    tavilyBySourceType,
    serpByEngine,
    searchSession,
  });
}
