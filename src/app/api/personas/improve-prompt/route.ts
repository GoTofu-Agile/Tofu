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
    const { text } = await generateText({
      model: getModel(),
      prompt: `You improve briefs for synthetic user research personas.

Rewrite the user's brief to be clearer, more specific, and richer in concrete signals: role, context, constraints, pains, and goals. Keep the same intent and audience. Do not add markdown or bullet labels—use 1–3 short paragraphs of plain prose.

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
