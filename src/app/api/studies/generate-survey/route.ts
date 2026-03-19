import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/ai/provider";

const surveySchema = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      type: z.enum(["open", "multiple_choice", "scale"]),
      options: z.array(z.string()).optional(),
      scaleMin: z.number().optional(),
      scaleMax: z.number().optional(),
    })
  ),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { description, orgContext } = body;

  if (!description) {
    return Response.json({ error: "Description required" }, { status: 400 });
  }

  const contextStr = orgContext
    ? `Product: ${orgContext.productName || "Unknown"}
Target audience: ${orgContext.targetAudience || "Unknown"}
Industry: ${orgContext.industry || "Unknown"}`
    : "";

  const { object } = await generateObject({
    model: getModel(),
    schema: surveySchema,
    prompt: `Generate a survey for: "${description}"

${contextStr}

Generate 6-10 survey questions. Mix question types:
- "open" for qualitative insights (2-3 questions)
- "multiple_choice" for categorical data (2-3 questions, provide 3-5 options each)
- "scale" for ratings (2-3 questions, use 1-5 or 1-10 scales)

Start with easy questions, get more specific.
Generate a concise title (5-10 words).
Each question needs a unique id (use q1, q2, etc).`,
  });

  return Response.json(object);
}
