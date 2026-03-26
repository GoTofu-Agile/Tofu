import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";

const requestSchema = z.object({
  description: z.string().min(1),
  orgContext: z
    .object({
      productName: z.string().optional(),
      targetAudience: z.string().optional(),
      industry: z.string().optional(),
    })
    .optional(),
});

const objectivesSchema = z.object({
  objectives: z
    .array(z.string())
    .describe("3-5 specific, actionable research objectives"),
  suggestedTitle: z.string().describe("A concise study title (5-10 words)"),
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

  try {
    const ctx = body.orgContext;
    const contextBlock = ctx
      ? `\nProduct: ${ctx.productName || "unknown"}\nIndustry: ${ctx.industry || "unknown"}\nTarget Audience: ${ctx.targetAudience || "unknown"}`
      : "";

    const { object } = await generateObject({
      model: getModel(),
      schema: objectivesSchema,
      prompt: `You are a senior UX researcher. Based on this research description, generate specific research objectives.
${contextBlock}

Research Description: "${body.description}"

Generate 3-5 research objectives that are:
- Specific and measurable
- Focused on understanding user behavior (not validating ideas)
- Actionable — each objective should map to concrete questions
- Following Mom Test principles (about their life, not your idea)

Also generate a concise study title (5-10 words).`,
    });

    return Response.json(object);
  } catch (error) {
    console.error("[study/suggest-objectives] AI generation failed:", error);
    const message = error instanceof Error ? error.message : "AI generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
