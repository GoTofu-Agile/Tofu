import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { EVALUATION_PROMPT } from "@/lib/ai/mom-test-rules";

const requestSchema = z.object({
  questions: z.array(z.string()).min(1),
  researchObjective: z.string().optional(),
  studyType: z.string().optional(),
});

const evaluationSchema = z.object({
  overallScore: z.number().min(1).max(10).describe("Overall research quality score"),
  evaluations: z.array(
    z.object({
      questionIndex: z.number(),
      score: z.number().min(1).max(10),
      issues: z.array(
        z.enum([
          "hypothetical",
          "opinion",
          "leading",
          "yes_no",
          "compliment_seeking",
          "too_generic",
          "future_focused",
        ])
      ),
      explanation: z.string().describe("Brief assessment of this question"),
      suggestion: z
        .string()
        .nullable()
        .describe("Rewritten version following Mom Test principles, or null if score >= 7"),
    })
  ),
  overallFeedback: z.string().describe("1-2 sentence summary of the guide quality"),
  missingTopics: z
    .array(z.string())
    .describe("Important research topics not yet covered by the questions"),
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
    const numberedQuestions = body.questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");

    const { object } = await generateObject({
      model: getModel(),
      schema: evaluationSchema,
      prompt: `${EVALUATION_PROMPT}

${body.researchObjective ? `Research Objective: "${body.researchObjective}"` : ""}
${body.studyType ? `Study Type: ${body.studyType}` : ""}

Evaluate these interview questions:

${numberedQuestions}

Return evaluations for each question (use 0-based questionIndex).
Also identify important topics the guide is missing based on the research objective.`,
    });

    return Response.json(object);
  } catch (error) {
    console.error("[study/evaluate-guide] AI evaluation failed:", error);
    const message = error instanceof Error ? error.message : "AI evaluation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
