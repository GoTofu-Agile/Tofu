import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { getStudy, updateStudy } from "@/lib/db/queries/studies";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { createNDJSONStream, streamDelay } from "@/lib/streaming/ndjson";

const requestSchema = z.object({
  title: z.string().default("Untitled Study"),
  description: z.string().optional(),
  studyType: z.string().default("INTERVIEW"),
  studyId: z.string(),
  existingQuestions: z.array(z.string()).optional(),
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

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  return createNDJSONStream(async (emit) => {
    // Step 1: Analyzing objective
    emit({ type: "step", step: "analyzing_objective", message: "Analyzing your research objective..." });
    await streamDelay(300);

    // Build context from DB
    let personaContext = "";
    let orgContextStr = "";
    let personaCount = 0;
    let groupCount = 0;

    const study = await getStudy(body.studyId);
    if (study) {
      if (study.personaGroups.length > 0) {
        groupCount = study.personaGroups.length;
        const groupDescriptions = study.personaGroups.map((spg) => {
          const group = spg.personaGroup;
          personaCount += group.personas.length;
          const personaSummaries = group.personas.slice(0, 15).map((p) => {
            const parts = [`${p.name}`];
            if (p.archetype) parts.push(`(${p.archetype})`);
            if (p.occupation) parts.push(`— ${p.occupation}`);
            if (p.age) parts.push(`age ${p.age}`);
            return parts.join(" ");
          });
          const groupDesc = group.description ? ` — ${group.description}` : "";
          return `Group "${group.name}"${groupDesc}:\n  ${personaSummaries.join("\n  ")}`;
        });
        personaContext = `\nTarget Audience (use these profiles to understand WHO you are interviewing and choose relevant topics — do NOT create individual questions per person):\n${groupDescriptions.join("\n")}`;
      }

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

    // Step 2: Reviewing personas
    emit({
      type: "step",
      step: "reviewing_personas",
      message: `Reviewing ${personaCount} personas across ${groupCount} groups...`,
    });
    await streamDelay(300);

    // Step 3: Crafting questions
    emit({ type: "step", step: "crafting_questions", message: "Crafting interview questions..." });

    // Build existing questions context to avoid duplicates
    const existingQuestionsContext = body.existingQuestions?.length
      ? `\n\nEXISTING QUESTIONS (DO NOT duplicate or rephrase these — generate DIFFERENT questions that complement them):\n${body.existingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
      : "";

    const { object } = await generateObject({
      model: getModel(),
      schema: guideSchema,
      prompt: `You are an expert user researcher trained in Rob Fitzpatrick's "The Mom Test" methodology.

## The Mom Test Framework
1. Talk about THEIR LIFE, not your idea — explore their reality
2. Ask about SPECIFICS IN THE PAST, not generics or opinions about the future
3. Talk less, listen more — open-ended questions that let them tell stories

Good questions sound like:
- "Tell me about the last time you..."
- "What happened when you...?"
- "Walk me through how you currently..."
- "Why did you bother doing that?"
- "What was the hardest part about...?"

## Study Context
Title: "${body.title}"
${body.description ? `Research Objective: "${body.description}"` : ""}
Type: ${body.studyType}
${orgContextStr}
${personaContext}
${existingQuestionsContext}

## Instructions
Generate 6-10 open-ended interview questions as ONE universal script for ALL participants:
- Questions MUST be deeply relevant to the research objective "${body.description || body.title}"
- Use persona profiles to understand their world — what industries, tools, frustrations, and goals are relevant
- NEVER address personas by name — questions must work for everyone
- Follow Mom Test: ask about past behavior, specific events, real experiences — NOT hypotheticals or opinions
- Start with warm-up about their background/context
- Progress from general to specific pain points
- Include behavior-focused follow-ups ("What did you do next?", "How did that affect you?")
- End with reflection or wrap-up
- Be conversational, not survey-like
- Avoid yes/no questions
${body.existingQuestions?.length ? "- DO NOT repeat or rephrase any existing questions listed above" : ""}

Also generate a concise study title (5-10 words).`,
    });

    // Stream questions one-by-one
    for (let i = 0; i < object.questions.length; i++) {
      await streamDelay(240);
      emit({
        type: "question",
        index: i,
        text: object.questions[i],
        total: object.questions.length,
      });
    }

    // Save guide to DB
    const guideText = object.questions.join("\n");
    await updateStudy(body.studyId, { interviewGuide: guideText });

    emit({ type: "done", title: object.title });
  });
}
