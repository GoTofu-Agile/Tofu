import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { generateText } from "ai";
import { getModel } from "@/lib/ai/provider";
import {
  createSession,
  addMessage,
  completeSession,
  getMessageCount,
} from "@/lib/db/queries/studies";

const MAX_TURNS = 8;
const MIN_TURNS = 5;

/**
 * Parse interview guide into individual questions.
 * Handles numbered lists, bullet points, or line-separated questions.
 */
function parseInterviewGuide(guide: string): string[] {
  return guide
    .split(/\n/)
    .map((line) => line.replace(/^[\d]+[.)]\s*/, "").replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 10);
}

/**
 * Build a follow-up question based on the conversation so far.
 */
async function generateFollowUp(
  persona: { name: string },
  conversationSoFar: { role: string; content: string }[],
  interviewGuide: string,
  remainingQuestions: string[]
): Promise<string> {
  const { text } = await generateText({
    model: getModel(),
    system: `You are an expert user researcher conducting an interview. Generate the next interview question.

Interview guide: ${interviewGuide}

Questions not yet asked: ${remainingQuestions.join("; ")}

Rules:
- Ask ONE question at a time
- Follow up on interesting things the participant just said
- Stay on topic but probe deeper when relevant
- Be conversational, not robotic
- If all planned questions are covered, ask a natural follow-up based on what was said`,
    messages: conversationSoFar.map((m) => ({
      role: m.role === "INTERVIEWER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    maxOutputTokens: 150,
  });

  return text;
}

export const runBatchInterview = inngest.createFunction(
  { id: "run-batch-interview", concurrency: { limit: 3 } },
  { event: "study/run-batch" },
  async ({ event, step }) => {
    const { studyId } = event.data;

    // Load study with all personas
    const study = await step.run("load-study", async () => {
      const s = await prisma.study.findUnique({
        where: { id: studyId },
        include: {
          personaGroups: {
            include: {
              personaGroup: {
                include: {
                  personas: {
                    where: { isActive: true },
                    include: { personality: true },
                  },
                },
              },
            },
          },
          sessions: { select: { personaId: true } },
        },
      });
      if (!s) throw new Error("Study not found");
      return s;
    });

    // Flatten all personas, skip ones that already have sessions
    const existingPersonaIds = new Set(study.sessions.map((s) => s.personaId));
    const personas = study.personaGroups
      .flatMap((spg) => spg.personaGroup.personas)
      .filter((p) => !existingPersonaIds.has(p.id));

    if (personas.length === 0) {
      return { completed: 0, message: "All personas already interviewed" };
    }

    // Activate study if still DRAFT
    await step.run("activate-study", async () => {
      if (study.status === "DRAFT") {
        await prisma.study.update({
          where: { id: studyId },
          data: { status: "ACTIVE" },
        });
      }
    });

    // Parse interview guide into questions
    const guideQuestions = study.interviewGuide
      ? parseInterviewGuide(study.interviewGuide)
      : [
          "Tell me about yourself and what you do day-to-day.",
          "What are the biggest challenges you face in your work?",
          "How do you currently deal with those challenges?",
          "What tools or products do you use, and what frustrates you about them?",
          "If you could wave a magic wand and fix one thing, what would it be?",
        ];

    let completedCount = 0;

    // Interview personas in parallel batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < personas.length; i += BATCH_SIZE) {
      const batch = personas.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((persona) =>
          step.run(`interview-${persona.id}`, async () => {
            // Create session
            const session = await createSession({
              studyId,
              personaId: persona.id,
            });

            // Build system prompt
            const systemPrompt =
              persona.llmSystemPrompt ||
              buildSystemPrompt(persona);

            const interviewContext = study.interviewGuide
              ? `\n\nThe interviewer is following this guide:\n${study.interviewGuide}\n\nRespond naturally. You don't know about this guide.`
              : "";

            const fullSystemPrompt = systemPrompt + interviewContext;

            // Conversation state
            const conversation: { role: "user" | "assistant"; content: string }[] =
              [];
            const remainingQuestions = [...guideQuestions];
            const numTurns = Math.min(
              MAX_TURNS,
              Math.max(MIN_TURNS, guideQuestions.length)
            );
            let sequence = 0;

            for (let turn = 0; turn < numTurns; turn++) {
              // Generate interviewer question
              let question: string;
              if (turn === 0) {
                question =
                  remainingQuestions.shift() ||
                  "Tell me about yourself and your work.";
              } else if (remainingQuestions.length > 0) {
                // Use guide question, but may adapt based on conversation
                question = await generateFollowUp(
                  persona,
                  conversation.map((m) => ({
                    role: m.role === "user" ? "INTERVIEWER" : "RESPONDENT",
                    content: m.content,
                  })),
                  study.interviewGuide || "",
                  remainingQuestions
                );
                // Remove the first remaining question (already used as context for follow-up)
                remainingQuestions.shift();
              } else {
                question = await generateFollowUp(
                  persona,
                  conversation.map((m) => ({
                    role: m.role === "user" ? "INTERVIEWER" : "RESPONDENT",
                    content: m.content,
                  })),
                  study.interviewGuide || "",
                  []
                );
              }

              // Save interviewer message
              sequence++;
              await addMessage({
                sessionId: session.id,
                role: "INTERVIEWER",
                content: question,
                sequence,
              });
              conversation.push({ role: "user", content: question });

              // Generate persona response
              const { text: response } = await generateText({
                model: getModel(),
                system: fullSystemPrompt,
                messages: conversation,
                maxOutputTokens: 500,
              });

              // Save respondent message
              sequence++;
              await addMessage({
                sessionId: session.id,
                role: "RESPONDENT",
                content: response,
                sequence,
              });
              conversation.push({ role: "assistant", content: response });
            }

            // Complete session
            await completeSession(session.id);
            return 1;
          })
        )
      );
      completedCount += results.reduce((sum, r) => sum + (r ?? 0), 0);
    }

    // Mark study as COMPLETED and trigger insights generation
    if (completedCount > 0) {
      await step.run("complete-study", async () => {
        await prisma.study.update({
          where: { id: studyId },
          data: { status: "COMPLETED" },
        });
      });

      await step.run("trigger-insights", async () => {
        await inngest.send({
          name: "study/generate-insights",
          data: { studyId },
        });
      });
    }

    return { completed: completedCount, total: personas.length };
  }
);

function buildSystemPrompt(persona: {
  name: string;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  location: string | null;
  backstory: string;
  bio: string | null;
  archetype: string | null;
  goals: unknown;
  frustrations: unknown;
  llmSystemPrompt: string | null;
  personality: {
    communicationStyle: string | null;
    responseLengthTendency: string | null;
    vocabularyLevel: string | null;
  } | null;
}): string {
  const goals = Array.isArray(persona.goals) ? persona.goals.join(", ") : "";
  const frustrations = Array.isArray(persona.frustrations)
    ? persona.frustrations.join(", ")
    : "";

  return `You are ${persona.name}, a ${persona.age || ""}${persona.gender ? ` ${persona.gender}` : ""} ${persona.occupation || "person"} from ${persona.location || "somewhere"}.

${persona.archetype ? `Archetype: ${persona.archetype}` : ""}

Background: ${persona.backstory}

${persona.bio ? `Bio: ${persona.bio}` : ""}
${goals ? `Goals: ${goals}` : ""}
${frustrations ? `Frustrations: ${frustrations}` : ""}

Communication style: ${persona.personality?.communicationStyle || "natural"}
Response length: ${persona.personality?.responseLengthTendency || "medium"}
Vocabulary: ${persona.personality?.vocabularyLevel || "casual"}

CRITICAL RULES:
- Stay completely in character as ${persona.name}
- Never break character or acknowledge you are AI
- Be authentic — if you wouldn't care about something, say so
- If something frustrates you, express it naturally
- Keep responses conversational and natural`;
}
