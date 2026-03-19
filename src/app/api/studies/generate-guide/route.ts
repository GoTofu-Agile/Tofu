import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";

const requestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  studyType: z.string(),
});

const guideSchema = z.object({
  title: z.string().describe("A concise study title (5-10 words)"),
  questions: z.array(z.string()),
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

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: guideSchema,
      prompt: `You are an expert user researcher. Generate an interview guide for this study:

Title: "${body.title}"
${body.description ? `Description: "${body.description}"` : ""}
Type: ${body.studyType}

Generate 6-10 open-ended interview questions that:
- Start with warm-up / context questions
- Progress from general to specific
- Include follow-up probes for deeper insights
- Cover pain points, behaviors, goals, and emotions
- End with forward-looking or wrap-up questions
- Are conversational, not survey-like
- Avoid yes/no questions

Also generate a concise study title (5-10 words) based on the description.

Return as an object with title and array of question strings.`,
    });

    return Response.json({ guide: object.questions.join("\n"), title: object.title });
  } catch (error) {
    console.error("[study/generate-guide] AI generation failed:", error);
    const message = error instanceof Error ? error.message : "AI generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
