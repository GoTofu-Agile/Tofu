import { z } from "zod";

export const createPersonaGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  domainContext: z.string().max(2000).optional(),
  count: z.number().int().min(1).max(100).default(5),
});

export type CreatePersonaGroupInput = z.infer<typeof createPersonaGroupSchema>;

const personaGenderSchema = z
  .enum(["Male", "Female", "male", "female"])
  .transform((value) => (value.toLowerCase() === "female" ? "Female" : "Male"));

export const personaSchema = z.object({
  name: z.string(),
  age: z.number().int().min(18).max(100),
  gender: personaGenderSchema,
  location: z.string(),
  occupation: z.string(),
  bio: z.string(),
  backstory: z.string().min(200),
  goals: z.array(z.string()),
  frustrations: z.array(z.string()),
  behaviors: z.array(z.string()),

  // Rich persona fields
  archetype: z.string(), // e.g. "The Pragmatic Skeptic"
  representativeQuote: z.string(), // a quote capturing their voice
  techLiteracy: z.number().int().min(1).max(5),
  domainExpertise: z.enum(["novice", "intermediate", "expert"]),
  dayInTheLife: z.string().min(160), // narrative scenario
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

export const personaEvaluationStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export const personaClaimJudgeSchema = z.object({
  claimText: z.string().min(3),
  claimType: z.enum([
    "identity",
    "demographic",
    "career",
    "education",
    "skills",
    "location",
    "preference",
    "behavioral",
    "timeline",
    "other",
  ]),
  status: z.enum(["SUPPORTED", "UNSUPPORTED", "UNCERTAIN", "SYNTHETIC"]),
  confidence: z.number().int().min(0).max(100),
  evidence: z.array(z.string()).default([]),
});

export const personaJudgeOutputSchema = z.object({
  factualityScore: z.number().int().min(0).max(100),
  consistencyScore: z.number().int().min(0).max(100),
  realismScore: z.number().int().min(0).max(100),
  verifiabilityScore: z.number().int().min(0).max(100),
  summary: z.string().max(1000),
  riskFlags: z.array(z.string()).default([]),
  extractedClaims: z.array(personaClaimJudgeSchema).default([]),
});

export type PersonaJudgeOutput = z.infer<typeof personaJudgeOutputSchema>;

const JUDGE_CLAIM_TYPES = [
  "identity",
  "demographic",
  "career",
  "education",
  "skills",
  "location",
  "preference",
  "behavioral",
  "timeline",
  "other",
] as const;

const JUDGE_CLAIM_STATUSES = [
  "SUPPORTED",
  "UNSUPPORTED",
  "UNCERTAIN",
  "SYNTHETIC",
] as const;

function clampJudgeScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseLooseScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampJudgeScore(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return clampJudgeScore(parsed);
  }
  return 50;
}

function normalizeJudgeClaimType(value: unknown): (typeof JUDGE_CLAIM_TYPES)[number] {
  if (typeof value !== "string") return "other";
  const key = value.trim().toLowerCase();
  const allowed = new Set(JUDGE_CLAIM_TYPES.map((t) => t.toLowerCase()));
  if (allowed.has(key)) {
    return JUDGE_CLAIM_TYPES.find((t) => t.toLowerCase() === key) ?? "other";
  }
  return "other";
}

function normalizeJudgeClaimStatus(value: unknown): (typeof JUDGE_CLAIM_STATUSES)[number] {
  if (typeof value !== "string") return "UNCERTAIN";
  const upper = value.trim().toUpperCase();
  if ((JUDGE_CLAIM_STATUSES as readonly string[]).includes(upper)) {
    return upper as (typeof JUDGE_CLAIM_STATUSES)[number];
  }
  const lower = value.trim().toLowerCase();
  if (lower === "supported") return "SUPPORTED";
  if (lower === "unsupported") return "UNSUPPORTED";
  if (lower === "uncertain") return "UNCERTAIN";
  if (lower === "synthetic") return "SYNTHETIC";
  return "UNCERTAIN";
}

function normalizeEvidence(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (value == null || value === "") return [];
    return [typeof value === "string" ? value : JSON.stringify(value)];
  }
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item == null) return "";
      if (typeof item === "number" || typeof item === "boolean") return String(item);
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    })
    .filter((s) => s.length > 0)
    .slice(0, 12);
}

/**
 * Normalizes messy model JSON (float scores, wrong enums, non-array evidence) into the strict
 * shape expected by persistence. Used when structured `generateObject` validation fails.
 */
export function parsePersonaJudgeOutputLoose(raw: unknown): PersonaJudgeOutput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Judge output was not a JSON object");
  }
  const o = raw as Record<string, unknown>;

  let summary =
    typeof o.summary === "string"
      ? o.summary.trim()
      : "Model-assisted trust evaluation completed.";
  if (summary.length === 0) {
    summary = "Model-assisted trust evaluation completed.";
  }
  if (summary.length > 1000) {
    summary = `${summary.slice(0, 997)}…`;
  }

  const riskFlags = Array.isArray(o.riskFlags)
    ? o.riskFlags.map((x) => String(x)).filter((s) => s.length > 0).slice(0, 24)
    : [];

  const claimsRaw = Array.isArray(o.extractedClaims) ? o.extractedClaims : [];
  const extractedClaims = claimsRaw
    .filter((c) => c && typeof c === "object")
    .map((c) => {
      const r = c as Record<string, unknown>;
      let claimText =
        typeof r.claimText === "string"
          ? r.claimText.trim()
          : r.claimText != null
            ? String(r.claimText).trim()
            : "";
      if (claimText.length < 3) {
        claimText = "Unspecified claim";
      }
      if (claimText.length > 8000) {
        claimText = `${claimText.slice(0, 7997)}…`;
      }
      return {
        claimText,
        claimType: normalizeJudgeClaimType(r.claimType),
        status: normalizeJudgeClaimStatus(r.status),
        confidence: parseLooseScore(r.confidence),
        evidence: normalizeEvidence(r.evidence),
      };
    })
    .slice(0, 80);

  const normalized = {
    factualityScore: parseLooseScore(o.factualityScore),
    consistencyScore: parseLooseScore(o.consistencyScore),
    realismScore: parseLooseScore(o.realismScore),
    verifiabilityScore: parseLooseScore(o.verifiabilityScore),
    summary,
    riskFlags,
    extractedClaims,
  };

  return personaJudgeOutputSchema.parse(normalized);
}

export const personaRetryEvaluationSchema = z.object({
  force: z.boolean().optional().default(false),
});
