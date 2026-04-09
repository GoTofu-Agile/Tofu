import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { getStudy } from "@/lib/db/queries/studies";
import { getOrgProductContext, getUserRole } from "@/lib/db/queries/organizations";

const requestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  studyType: z.string(),
  studyId: z.string().optional(),
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
    // Build context from DB if studyId provided
    let personaContext = "";
    let orgContextStr = "";

    if (body.studyId) {
      const study = await getStudy(body.studyId);
      if (study) {
        const role = await getUserRole(study.organizationId, dbUser.id);
        if (!role) {
          return Response.json({ error: "Access denied" }, { status: 403 });
        }

        // Load persona context
        if (study.personaGroups.length > 0) {
          const groupDescriptions = study.personaGroups.map((spg) => {
            const group = spg.personaGroup;
            const personaSummaries = group.personas.slice(0, 15).map((p) => {
              const parts = [p.name];
              if (p.archetype) parts.push(`(${p.archetype})`);
              if (p.occupation) parts.push(`— ${p.occupation}`);
              if (p.age) parts.push(`age ${p.age}`);
              return parts.join(" ");
            });
            return `Group "${group.name}": ${personaSummaries.join("; ")}`;
          });
          personaContext = `\nTarget Audience (use these profiles to understand WHO you are interviewing and choose relevant topics — do NOT create individual questions per person):\n${groupDescriptions.join("\n")}`;
        }

        // Load org context
        const orgCtx = await getOrgProductContext(study.organizationId);
        if (orgCtx?.setupCompleted) {
          const parts: string[] = [];
          if (orgCtx.productName) parts.push(`Product: ${orgCtx.productName}`);
          if (orgCtx.productDescription) parts.push(`Description: ${orgCtx.productDescription}`);
          if (orgCtx.targetAudience) parts.push(`Target Audience: ${orgCtx.targetAudience}`);
          if (orgCtx.industry) parts.push(`Industry: ${orgCtx.industry}`);
          if (parts.length > 0) orgContextStr = `\nProduct Context:\n${parts.join("\n")}`;
        }
      }
    }

    const { object } = await generateObject({
      model: getModel(),
      schema: guideSchema,
      prompt: `You are an expert user researcher. Generate an interview guide for this study:

Title: "${body.title}"
${body.description ? `Description: "${body.description}"` : ""}
Type: ${body.studyType}
${orgContextStr}
${personaContext}

Generate 6-10 open-ended interview questions as ONE universal interview script that will be asked to ALL participants:
- NEVER address individual personas by name — questions must be generic enough for everyone but themed around the audience's world
- Use the persona profiles ONLY to understand what topics, industries, and pain points are relevant
- Start with warm-up / context questions about their background
- Progress from general to specific
- Include follow-up probes for deeper insights
- Cover pain points, behaviors, goals, and emotions relevant to this audience
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
