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

  // Rich persona fields
  archetype: z.string(), // e.g. "The Pragmatic Skeptic"
  representativeQuote: z.string(), // a quote capturing their voice
  techLiteracy: z.number().int().min(1).max(5),
  domainExpertise: z.enum(["novice", "intermediate", "expert"]),
  dayInTheLife: z.string(), // narrative scenario
  coreValues: z.array(z.string()), // ranked list of values
  communicationSample: z.string(), // example response showing voice

  personality: z.object({
    // Big Five
    openness: z.number().min(0).max(1),
    conscientiousness: z.number().min(0).max(1),
    extraversion: z.number().min(0).max(1),
    agreeableness: z.number().min(0).max(1),
    neuroticism: z.number().min(0).max(1),

    // Communication
    communicationStyle: z.enum(["direct", "verbose", "analytical", "empathetic"]),
    responseLengthTendency: z.enum(["short", "medium", "long"]),

    // Decision & Behavior
    decisionMakingStyle: z.enum(["analytical", "intuitive", "dependent", "avoidant", "spontaneous"]),
    riskTolerance: z.number().min(0).max(1),
    trustPropensity: z.number().min(0).max(1),
    emotionalExpressiveness: z.number().min(0).max(1),

    // Interview Behavior Modifiers
    directness: z.number().min(0).max(1),
    criticalFeedbackTendency: z.number().min(0).max(1),
    vocabularyLevel: z.enum(["casual", "professional", "academic", "technical"]),
    tangentTendency: z.number().min(0).max(1),
  }),
});

export type PersonaOutput = z.infer<typeof personaSchema>;

// Wizard schemas
export const wizardProductInfoSchema = z.object({
  productName: z.string().min(1, "Product name is required").max(100),
  oneLiner: z.string().min(1, "One-liner is required").max(300),
  targetAudience: z.string().min(1, "Target audience is required"),
  competitors: z.string().max(500).optional(), // comma-separated
  researchGoals: z.array(z.string()).min(1, "Select at least one research goal"),
});

export type WizardProductInfo = z.infer<typeof wizardProductInfoSchema>;

export const wizardGroupSettingsSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  count: z.number().int().min(3).max(50).default(10),
  includeSkeptics: z.boolean().default(true),
});

export type WizardGroupSettings = z.infer<typeof wizardGroupSettingsSchema>;

// Creation flow schemas
export const quickPromptSchema = z.object({
  prompt: z.string().min(5, "Describe your target user in at least a few words").max(500),
});

export type QuickPromptInput = z.infer<typeof quickPromptSchema>;

export const manualFormSchema = z.object({
  role: z.string().min(1, "Role is required").max(100),
  industry: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  ageRange: z.enum(["18-25", "26-35", "36-45", "46-55", "56+", "Any"]).default("Any"),
  location: z.string().max(100).optional(),
  background: z.string().max(1000).optional(),
  painPoints: z.string().max(1000).optional(),
  tools: z.string().max(500).optional(),
});

export type ManualFormInput = z.infer<typeof manualFormSchema>;

// Unified creation flow schemas
export const extractRequestSchema = z.object({
  freetext: z.string().min(5, "Describe your target users").max(2000),
  orgContext: z.object({
    productName: z.string().optional(),
    productDescription: z.string().optional(),
    targetAudience: z.string().optional(),
    industry: z.string().optional(),
    competitors: z.string().optional(),
  }).optional(),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;

export const extractedContextSchema = z.object({
  groupName: z.string(),
  targetUserRole: z.string(),
  industry: z.string().nullable(),
  painPoints: z.array(z.string()),
  demographicsHints: z.string().nullable(),
  domainContext: z.string(),
});

export type ExtractedContext = z.infer<typeof extractedContextSchema>;

/** LLM output: map a target audience to concrete App Store apps (after Tavily discovery). */
export const appStoreAudienceMappedAppSchema = z.object({
  appName: z.string().min(1).max(120),
  appUrl: z.string().url(),
  reasoning: z.string().min(1).max(800),
});

export const appStoreAudienceMappingResultSchema = z.object({
  apps: z.array(appStoreAudienceMappedAppSchema).max(8),
});

export type AppStoreAudienceMappedApp = z.infer<
  typeof appStoreAudienceMappedAppSchema
>;
