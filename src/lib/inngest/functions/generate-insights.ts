import { inngest } from "../client";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import {
  getStudyTranscripts,
  createAnalysisReport,
} from "@/lib/db/queries/studies";
import { prisma } from "@/lib/db/prisma";

const insightsSchema = z.object({
  summary: z.string(),
  themes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      frequency: z.number().int().min(1),
      sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
      personaNames: z.array(z.string()).describe("Names of personas who mentioned this theme"),
    })
  ),
  keyQuotes: z.array(
    z.object({
      quote: z.string(),
      personaName: z.string(),
      context: z.string(),
      theme: z.string(),
    })
  ),
  sentimentBreakdown: z.object({
    overall: z.enum(["positive", "negative", "neutral", "mixed"]),
    positivePercent: z.number(),
    negativePercent: z.number(),
    neutralPercent: z.number(),
  }),
  recommendations: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      supportingEvidence: z.string(),
    })
  ),
});

export const generateInsights = inngest.createFunction(
  { id: "generate-study-insights", concurrency: { limit: 2 } },
  { event: "study/generate-insights" },
  async ({ event, step }) => {
    const { studyId, analysisTypes, customPrompt } = event.data as {
      studyId: string;
      analysisTypes?: string[];
      customPrompt?: string;
    };

    // Load study + all transcripts
    const [study, transcripts] = await step.run("load-data", async () => {
      const s = await prisma.study.findUnique({
        where: { id: studyId },
        select: { id: true, title: true, interviewGuide: true },
      });
      if (!s) throw new Error("Study not found");

      const t = await getStudyTranscripts(studyId);
      if (t.length === 0) throw new Error("No completed interviews found");

      return [s, t] as const;
    });

    // Format transcripts for LLM
    const formattedTranscripts = transcripts
      .map((session) => {
        const persona = session.persona;
        const header = `--- Interview with ${persona.name} (${persona.occupation || "unknown role"}, age ${persona.age || "?"}, archetype: ${persona.archetype || "?"}) ---`;
        const messages = session.messages
          .map(
            (m) =>
              `${m.role === "INTERVIEWER" ? "Interviewer" : persona.name}: ${m.content}`
          )
          .join("\n\n");
        return `${header}\n\n${messages}`;
      })
      .join("\n\n===\n\n");

    // Generate insights via LLM
    const insights = await step.run("analyze", async () => {
      const analysisFocus =
        analysisTypes && analysisTypes.length > 0
          ? `\n## Requested analysis focus\nPrioritize these angles (IDs): ${analysisTypes.join(", ")}\n`
          : "";
      const customInstructions = customPrompt?.trim()
        ? `\n## Additional instructions from the researcher\n${customPrompt.trim()}\n`
        : "";

      const { object } = await generateObject({
        model: getModel(),
        schema: insightsSchema,
        prompt: `You are an expert user researcher analyzing interview transcripts from a study titled "${study.title}".

${study.interviewGuide ? `Interview Guide: ${study.interviewGuide}\n` : ""}
${analysisFocus}${customInstructions}

${transcripts.length} interviews were conducted with synthetic personas. Analyze ALL transcripts and extract:

1. **Summary**: 2-3 sentence executive summary of the key findings
2. **Themes**: Recurring themes across interviews. Include name, description, how many interviews mentioned it, overall sentiment, and the exact persona names who mentioned it
3. **Key Quotes**: 5-10 most insightful/representative quotes with persona name, context, and which theme they relate to
4. **Sentiment Breakdown**: Overall sentiment distribution across all interviews (positive/negative/neutral percentages)
5. **Recommendations**: 3-5 actionable recommendations based on the findings, with priority and supporting evidence

Be specific and cite actual content from the interviews. Don't be generic.

TRANSCRIPTS:
${formattedTranscripts}`,
      });
      return object;
    });

    // Save to database
    const report = await step.run("save-report", async () => {
      return createAnalysisReport({
        studyId,
        title: `Analysis: ${study.title}`,
        summary: insights.summary,
        keyFindings: insights.keyQuotes,
        themes: insights.themes,
        sentimentBreakdown: insights.sentimentBreakdown,
        recommendations: insights.recommendations,
      });
    });

    return { reportId: report.id };
  }
);
