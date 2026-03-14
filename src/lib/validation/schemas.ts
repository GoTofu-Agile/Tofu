import { z } from "zod";

export const createPersonaGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  domainContext: z.string().max(2000).optional(),
  count: z.number().int().min(1).max(100).default(5),
});

export type CreatePersonaGroupInput = z.infer<typeof createPersonaGroupSchema>;

export const personaSchema = z.object({
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

export type PersonaOutput = z.infer<typeof personaSchema>;
