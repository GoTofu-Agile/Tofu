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

function normalizeSentimentBreakdown(input: {
  overall: "positive" | "negative" | "neutral" | "mixed";
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
}) {
  const p = Math.max(0, Math.round(input.positivePercent));
  const n = Math.max(0, Math.round(input.negativePercent));
  const u = Math.max(0, Math.round(input.neutralPercent));
  const total = p + n + u;
  if (total <= 0) {
    return { ...input, positivePercent: 0, negativePercent: 0, neutralPercent: 100 };
  }
  const scaled = [p, n, u].map((v) => Math.round((v / total) * 100));
  let diff = 100 - (scaled[0] + scaled[1] + scaled[2]);
  const maxIdx = scaled[0] >= scaled[1] && scaled[0] >= scaled[2] ? 0 : scaled[1] >= scaled[2] ? 1 : 2;
  scaled[maxIdx] += diff;
  diff = 100 - (scaled[0] + scaled[1] + scaled[2]);
  if (diff !== 0) scaled[2] += diff;
  return {
    ...input,
    positivePercent: scaled[0],
    negativePercent: scaled[1],
    neutralPercent: scaled[2],
  };
}

export const generateInsights = inngest.createFunction(
  { id: "generate-study-insights", concurrency: { limit: 2 } },
  { event: "study/generate-insights" },
  async ({ event, step }) => {
    const { studyId, analysisTypes, customPrompt } = event.data as {
      studyId: string;
      analysisTypes?: string[];
      customPrompt?: string;
    };

    // Load study + transcripts in parallel — completely independent queries
    const [study, transcripts] = await step.run("load-data", async () => {
      const [s, t] = await Promise.all([
        prisma.study.findUnique({
          where: { id: studyId },
          select: { id: true, title: true, interviewGuide: true },
        }),
        getStudyTranscripts(studyId),
      ]);
      if (!s) throw new Error("Study not found");
      if (t.length === 0) throw new Error("No completed interviews found");

      return [s, t] as const;
    });

    // Extract persona names for the prompt
    const personaNames = transcripts.map((s) => s.persona.name);

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

    // Generate insights via LLM — use dynamic schema to enforce min quotes
    const dynamicSchema = insightsSchema.extend({
      keyQuotes: z.array(
        z.object({
          quote: z.string(),
          personaName: z.string(),
          context: z.string(),
          theme: z.string(),
        })
      ).min(personaNames.length),
    });

    const insights = await step.run("analyze", async () => {
      const { object } = await generateObject({
        model: getModel(),
        temperature: 0.4,
        maxOutputTokens: 3000,
        schema: dynamicSchema,
        prompt: `You are an expert user researcher analyzing interview transcripts from a study titled "${study.title}".

${study.interviewGuide ? `Interview Guide: ${study.interviewGuide}\n` : ""}
${customPrompt ? `\nSpecific analysis request from the researcher: "${customPrompt}"\n` : ""}
${analysisTypes?.length ? `\nFocus areas requested: ${analysisTypes.join(", ").replace(/_/g, " ")}\n` : ""}

${transcripts.length} interviews were conducted with synthetic personas. Analyze ALL transcripts and extract:

1. **Summary**: 2-3 sentence executive summary of the key findings
2. **Themes**: Recurring themes across interviews. Include name, description, how many interviews mentioned it, overall sentiment, and the exact persona names who mentioned it
3. **Key Quotes**: You MUST include at least one representative quote from EACH of these ${personaNames.length} personas: ${personaNames.join(", ")}. Return a minimum of ${personaNames.length} quotes. Each quote must include the persona's exact name, context, and which theme it relates to. This is a HARD REQUIREMENT — every single persona must appear at least once in keyQuotes.
4. **Sentiment Breakdown**: Overall sentiment distribution across all interviews (positive/negative/neutral percentages)
5. **Recommendations**: 3-5 actionable recommendations based on the findings, with priority and supporting evidence

Be specific and cite actual content from the interviews. Don't be generic. Double-check that every persona listed above has at least one entry in keyQuotes before returning.

TRANSCRIPTS:
${formattedTranscripts}`,
      });
      return object;
    });

    const normalizedSentiment = normalizeSentimentBreakdown(
      insights.sentimentBreakdown as {
        overall: "positive" | "negative" | "neutral" | "mixed";
        positivePercent: number;
        negativePercent: number;
        neutralPercent: number;
      }
    );

    // Save to database
    const report = await step.run("save-report", async () => {
      return createAnalysisReport({
        studyId,
        title: `Analysis: ${study.title}`,
        summary: insights.summary,
        keyFindings: insights.keyQuotes,
        themes: insights.themes,
        sentimentBreakdown: normalizedSentiment,
        recommendations: insights.recommendations,
      });
    });

    return { reportId: report.id };
  }
);
