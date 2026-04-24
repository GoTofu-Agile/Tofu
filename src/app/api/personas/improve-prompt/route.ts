import { NextRequest } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";

const bodySchema = z.object({
  text: z.string().min(3).max(2000),
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

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const wordCount = body.text.trim().split(/\s+/).filter(Boolean).length;
    const { text } = await generateText({
      model: getModel(),
      prompt: `You improve persona briefs for synthetic user research.

Your task:
- Preserve the core intent, audience, and role from the user's brief.
- Expand the brief into richer, practical prose by clarifying likely context, goals, constraints, and pain points.
- You may infer reasonable generic details from the stated role/context, but do NOT fabricate specific proper nouns (person names, company names, exact tools, exact locations) unless already provided.
- Do NOT turn it into a fictional character story.
- Return plain text only (no markdown, no bullets, no labels, no quotes).

Length rules:
- If the input is short (${wordCount} words, under 8), return 2-3 concise sentences.
- Otherwise, return 3-5 concise sentences.
- Keep it compact but more detailed than the original.

User brief:
${body.text}`,
    });

    const improved = text.trim();
    if (!improved) {
      return Response.json({ error: "Empty response" }, { status: 502 });
    }
    return Response.json({ improved });
  } catch (e) {
    console.error("[improve-prompt]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Improvement failed" },
      { status: 500 }
    );
  }
}
