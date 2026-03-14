import { inngest } from "../client";
import { generateAndSavePersonas } from "@/lib/ai/generate-personas";

export const generatePersonaBatch = inngest.createFunction(
  {
    id: "generate-persona-batch",
    concurrency: { limit: 5 },
    retries: 3,
  },
  { event: "persona/batch.requested" },
  async ({ event, step }) => {
    const { groupId, count, domainContext } = event.data as {
      groupId: string;
      count: number;
      domainContext?: string;
    };

    const result = await step.run("generate-all", async () => {
      return generateAndSavePersonas({ groupId, count, domainContext });
    });

    return result;
  }
);
