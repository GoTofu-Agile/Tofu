import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { getModel } from "@/lib/ai/provider";
import { generateObject } from "ai";
import { z } from "zod";

const personaSchema = z.object({
  name: z.string(),
  age: z.number().int().min(18).max(100),
  gender: z.string(),
  location: z.string(),
  occupation: z.string(),
  bio: z.string(),
  backstory: z.string(),
  goals: z.array(z.string()),
  frustrations: z.array(z.string()),
  behaviors: z.array(z.string()),
  personality: z.object({
    openness: z.number().min(0).max(1),
    conscientiousness: z.number().min(0).max(1),
    extraversion: z.number().min(0).max(1),
    agreeableness: z.number().min(0).max(1),
    neuroticism: z.number().min(0).max(1),
    communicationStyle: z.enum(["direct", "verbose", "analytical", "empathetic"]),
    responseLengthTendency: z.enum(["short", "medium", "long"]),
  }),
});

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

    // Load domain knowledge for RAG context
    const context = await step.run("load-context", async () => {
      const knowledge = await prisma.domainKnowledge.findMany({
        where: { personaGroupId: groupId },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      return knowledge.map((k) => k.content).join("\n\n");
    });

    const personas: z.infer<typeof personaSchema>[] = [];
    for (let i = 0; i < count; i++) {
      const result = await step.run(`generate-${i}`, async () => {
        const { object } = await generateObject({
          model: getModel(),
          schema: personaSchema,
          prompt: [
            "You are a demographic simulation engine. Generate a realistic, unique synthetic user persona.",
            domainContext ? `Domain context: ${domainContext}` : "",
            context ? `Background research:\n${context}` : "",
            `This is persona ${i + 1} of ${count}. Ensure diversity — vary age, gender, location, occupation, and personality traits.`,
            "Create a rich, believable backstory grounded in the domain context. Avoid stereotypes.",
          ]
            .filter(Boolean)
            .join("\n\n"),
        });
        return object;
      });
      personas.push(result);
    }

    // Save all personas to DB
    await step.run("save-personas", async () => {
      for (const p of personas) {
        await prisma.persona.create({
          data: {
            personaGroupId: groupId,
            name: p.name,
            age: p.age,
            gender: p.gender,
            location: p.location,
            occupation: p.occupation,
            bio: p.bio,
            backstory: p.backstory,
            goals: p.goals,
            frustrations: p.frustrations,
            behaviors: p.behaviors,
            sourceType: "PROMPT_GENERATED",
            personality: {
              create: {
                openness: p.personality.openness,
                conscientiousness: p.personality.conscientiousness,
                extraversion: p.personality.extraversion,
                agreeableness: p.personality.agreeableness,
                neuroticism: p.personality.neuroticism,
                communicationStyle: p.personality.communicationStyle,
                responseLengthTendency: p.personality.responseLengthTendency,
              },
            },
          },
        });
      }

      // Update group persona count
      await prisma.personaGroup.update({
        where: { id: groupId },
        data: {
          personaCount: { increment: personas.length },
        },
      });
    });

    return { generated: personas.length, groupId };
  }
);
