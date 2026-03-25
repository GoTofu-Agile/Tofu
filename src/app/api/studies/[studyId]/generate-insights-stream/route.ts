import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { getModel } from "@/lib/ai/provider";
import {
  getStudyTranscripts,
  createAnalysisReport,
} from "@/lib/db/queries/studies";
import { prisma } from "@/lib/db/prisma";
import { createNDJSONStream, streamDelay } from "@/lib/streaming/ndjson";

const requestSchema = z.object({
  analysisTypes: z.array(z.string()).optional(),
  customPrompt: z.string().optional(),
});

// Split into two schemas for two-pass approach
const themesSchema = z.object({
  themes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      frequency: z.number().int().min(1),
      sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
      personaNames: z.array(z.string()),
    })
  ),
  sentimentBreakdown: z.object({
    overall: z.enum(["positive", "negative", "neutral", "mixed"]),
    positivePercent: z.number(),
    negativePercent: z.number(),
    neutralPercent: z.number(),
  }),
});

function makeQuotesSchema(minQuotes: number) {
  return z.object({
    keyQuotes: z
      .array(
        z.object({
          quote: z.string(),
          personaName: z.string(),
          context: z.string(),
          theme: z.string(),
        })
      )
      .min(minQuotes),
    recommendations: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        priority: z.enum(["high", "medium", "low"]),
        supportingEvidence: z.string(),
      })
    ),
    summary: z.string(),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const { studyId } = await params;

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

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: { organizationId: true, title: true, interviewGuide: true },
  });
  if (!study) {
    return Response.json({ error: "Study not found" }, { status: 404 });
  }

  const role = await getUserRole(study.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  let body: z.infer<typeof requestSchema> = {};
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    // Use defaults
  }

  return createNDJSONStream(async (emit) => {
    // Step 1: Load transcripts
    emit({
      type: "step",
      step: "loading_transcripts",
      message: "Loading interview transcripts...",
    });

    const transcripts = await getStudyTranscripts(studyId);
    if (transcripts.length === 0) {
      emit({ type: "error", message: "No completed interviews found" });
      return;
    }

    const personaNames = transcripts.map((s) => s.persona.name);
    const totalWords = transcripts.reduce(
      (sum, s) =>
        sum + s.messages.reduce((mSum, m) => mSum + m.content.split(" ").length, 0),
      0
    );

    emit({
      type: "step",
      step: "loading_transcripts",
      status: "done",
      message: `${transcripts.length} transcripts loaded`,
      detail: `${totalWords.toLocaleString()} words from ${personaNames.length} personas`,
    });
    await streamDelay(300);

    // Format transcripts
    const formattedTranscripts = transcripts
      .map((session) => {
        const p = session.persona;
        const header = `--- Interview with ${p.name} (${p.occupation || "unknown"}, age ${p.age || "?"}, archetype: ${p.archetype || "?"}) ---`;
        const messages = session.messages
          .map(
            (m) =>
              `${m.role === "INTERVIEWER" ? "Interviewer" : p.name}: ${m.content}`
          )
          .join("\n\n");
        return `${header}\n\n${messages}`;
      })
      .join("\n\n===\n\n");

    const baseContext = `You are an expert user researcher analyzing interview transcripts from a study titled "${study.title}".
${study.interviewGuide ? `Interview Guide: ${study.interviewGuide}\n` : ""}
${body.customPrompt ? `\nSpecific analysis request: "${body.customPrompt}"\n` : ""}
${body.analysisTypes?.length ? `\nFocus areas: ${body.analysisTypes.join(", ").replace(/_/g, " ")}\n` : ""}`;

    // Step 2: Analyze themes + sentiment (Pass 1)
    emit({
      type: "step",
      step: "analyzing_themes",
      message: "Analyzing themes and sentiment...",
    });

    const { object: themesResult } = await generateObject({
      model: getModel(),
      schema: themesSchema,
      prompt: `${baseContext}

Analyze these ${transcripts.length} interview transcripts and extract:

1. **Themes**: Recurring themes across interviews. For each: name, description, frequency (how many interviews), sentiment, and exact persona names who mentioned it.
2. **Sentiment Breakdown**: Overall sentiment distribution (positive/negative/neutral percentages).

Be specific and cite actual content. Don't be generic.

TRANSCRIPTS:
${formattedTranscripts}`,
    });

    emit({
      type: "partial_themes",
      themes: themesResult.themes,
    });
    emit({
      type: "partial_sentiment",
      sentiment: themesResult.sentimentBreakdown,
    });
    emit({
      type: "step",
      step: "analyzing_themes",
      status: "done",
      message: `Found ${themesResult.themes.length} themes`,
    });
    await streamDelay(300);

    // Step 3: Extract quotes + recommendations + summary (Pass 2)
    emit({
      type: "step",
      step: "extracting_quotes",
      message: "Extracting key quotes and generating recommendations...",
    });

    const themeNames = themesResult.themes.map((t) => t.name);

    const { object: quotesResult } = await generateObject({
      model: getModel(),
      schema: makeQuotesSchema(personaNames.length),
      prompt: `${baseContext}

The following themes were identified: ${themeNames.join(", ")}

Now extract from the same transcripts:

1. **Key Quotes**: You MUST include at least one representative quote from EACH of these ${personaNames.length} personas: ${personaNames.join(", ")}. Each quote must include the persona's exact name, context, and which theme it relates to.
2. **Recommendations**: 3-5 actionable recommendations with priority and supporting evidence.
3. **Summary**: 2-3 sentence executive summary of all findings.

Double-check every persona is represented in keyQuotes.

TRANSCRIPTS:
${formattedTranscripts}`,
    });

    emit({ type: "partial_quotes", quotes: quotesResult.keyQuotes });
    emit({
      type: "step",
      step: "extracting_quotes",
      status: "done",
      message: `${quotesResult.keyQuotes.length} quotes from ${personaNames.length} personas`,
    });
    await streamDelay(200);

    emit({
      type: "partial_recommendations",
      recommendations: quotesResult.recommendations,
    });
    emit({ type: "summary", text: quotesResult.summary });
    await streamDelay(200);

    // Step 4: Save to DB
    emit({
      type: "step",
      step: "saving",
      message: "Saving analysis report...",
    });

    const report = await createAnalysisReport({
      studyId,
      title: `Analysis: ${study.title}`,
      summary: quotesResult.summary,
      keyFindings: quotesResult.keyQuotes,
      themes: themesResult.themes,
      sentimentBreakdown: themesResult.sentimentBreakdown,
      recommendations: quotesResult.recommendations,
    });

    emit({
      type: "step",
      step: "saving",
      status: "done",
      message: "Report saved",
    });

    emit({ type: "done", reportId: report.id });
  });
}
