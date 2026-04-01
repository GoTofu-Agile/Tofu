import { inngest } from "../client";
import { runPersonaEvaluation } from "@/lib/personas/evaluation/pipeline";
import { setPersonaEvaluationStatus } from "@/lib/personas/evaluation/repository";

export const evaluatePersona = inngest.createFunction(
  { id: "evaluate-persona", concurrency: { limit: 8 } },
  { event: "persona/evaluate.requested" },
  async ({ event, step }) => {
    const { personaId } = event.data as { personaId: string };
    try {
      await step.run("evaluate-persona", async () => {
        await runPersonaEvaluation(personaId);
      });
      return { ok: true };
    } catch (error) {
      await step.run("mark-evaluation-failed", async () => {
        await setPersonaEvaluationStatus(personaId, "FAILED", {
          message: error instanceof Error ? error.message : "Evaluation failed",
          at: new Date().toISOString(),
        });
      });
      throw error;
    }
  }
);
