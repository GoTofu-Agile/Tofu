import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";

const requestSchema = z.object({
  description: z.string().min(1),
  personaGroups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
    })
  ),
  orgContext: z
    .object({
      productName: z.string().nullable(),
      productDescription: z.string().nullable(),
      targetAudience: z.string().nullable(),
      industry: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

const setupSchema = z.object({
  title: z.string().describe("A concise study title (5-10 words)"),
  interviewGuide: z
    .array(z.string())
    .describe("6-10 open-ended interview questions"),
  suggestedGroupIds: z
    .array(z.string())
    .describe("IDs of persona groups most relevant to this study"),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  await getUser(authUser.id);

  let body;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const orgContextBlock = body.orgContext
    ? `\nProduct context:\n- Product: ${body.orgContext.productName || "N/A"}\n- Description: ${body.orgContext.productDescription || "N/A"}\n- Target audience: ${body.orgContext.targetAudience || "N/A"}\n- Industry: ${body.orgContext.industry || "N/A"}`
    : "";

  const groupsBlock =
    body.personaGroups.length > 0
      ? `\nAvailable persona groups (pick the most relevant ones by ID):\n${body.personaGroups.map((g) => `- ID: "${g.id}" | Name: "${g.name}" | Description: "${g.description || "none"}"`).join("\n")}`
      : "";

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: setupSchema,
      prompt: `You are an expert user researcher setting up a study.

The user described what they want to learn:
"${body.description}"
${orgContextBlock}
${groupsBlock}

Based on this, generate:
1. A concise study title (5-10 words)
2. An interview guide with 6-10 open-ended questions that:
   - Start with warm-up / context questions
   - Progress from general to specific
   - Include follow-up probes for deeper insights
   - Cover pain points, behaviors, goals, and emotions
   - End with forward-looking or wrap-up questions
   - Are conversational, not survey-like
   - Avoid yes/no questions
3. The IDs of the most relevant persona groups from the available list (if any match). Only include groups that are clearly relevant. If none match well, return an empty array.`,
    });

    return Response.json({
      title: object.title,
      interviewGuide: object.interviewGuide.join("\n"),
      suggestedGroupIds: object.suggestedGroupIds,
    });
  } catch (error) {
    console.error("[study/setup] AI generation failed:", error);
    const message = error instanceof Error ? error.message : "AI generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
