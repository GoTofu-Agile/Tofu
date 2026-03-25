import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { SAMPLE_SIZE_GUIDELINES } from "@/lib/ai/mom-test-rules";

const requestSchema = z.object({
  researchObjective: z.string().min(1),
  studyType: z.enum(["INTERVIEW", "SURVEY", "FOCUS_GROUP", "USABILITY_TEST"]),
  existingGroups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      personaCount: z.number(),
    })
  ),
  orgContext: z
    .object({
      productName: z.string().optional(),
      targetAudience: z.string().optional(),
      industry: z.string().optional(),
    })
    .optional(),
});

const suggestionSchema = z.object({
  suggestedExistingGroupIds: z
    .array(z.string())
    .describe("IDs of existing groups relevant to this study"),
  missingGroups: z.array(
    z.object({
      name: z.string().describe("Name for the suggested persona group"),
      description: z
        .string()
        .describe("Who these personas represent"),
      reason: z
        .string()
        .describe("Why this group is needed for the research objective"),
    })
  ),
  sampleSizeReasoning: z
    .string()
    .describe("Brief explanation of recommended sample size"),
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

  let body;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const guidelines = SAMPLE_SIZE_GUIDELINES[body.studyType];

  try {
    const groupsList = body.existingGroups
      .map((g) => `- "${g.name}" (${g.personaCount} personas): ${g.description || "no description"}`)
      .join("\n");

    const ctx = body.orgContext;
    const contextBlock = ctx
      ? `\nProduct: ${ctx.productName || "unknown"}\nIndustry: ${ctx.industry || "unknown"}\nTarget Audience: ${ctx.targetAudience || "unknown"}`
      : "";

    const { object } = await generateObject({
      model: getModel(),
      schema: suggestionSchema,
      prompt: `You are a senior UX researcher planning a ${body.studyType.toLowerCase()} study.
${contextBlock}

Research Objective: "${body.researchObjective}"

Existing persona groups in the workspace:
${groupsList || "(none)"}

Sample size guidelines for ${body.studyType}: ${guidelines.min}-${guidelines.max} participants. ${guidelines.reasoning}

Tasks:
1. Select which existing groups are most relevant (return their IDs: ${body.existingGroups.map((g) => g.id).join(", ")})
2. Identify 0-2 missing persona groups that would improve the research (only suggest if genuinely needed)
3. Explain the recommended sample size for this specific study

Only suggest missing groups that represent genuinely different perspectives. Don't over-segment.`,
    });

    return Response.json({
      ...object,
      recommendedSampleSize: guidelines,
    });
  } catch (error) {
    console.error("[study/suggest-audience] AI suggestion failed:", error);
    const message = error instanceof Error ? error.message : "AI suggestion failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
