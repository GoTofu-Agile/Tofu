import { generateObject } from "ai";
import { getPersonaGenerationModel } from "./provider";
import { qualityTierFromOrgPersonaCount, type PersonaQualityTier } from "@/lib/personas/persona-creation-policy";
import { countPersonasForOrganization } from "@/lib/db/queries/personas";
import { personaSchema, type PersonaOutput } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";
import type { PersonaTemplateConfig } from "@/lib/personas/templates";
import { assignAppStoreReviewsToPersonas } from "@/lib/personas/assign-app-store-reviews";
import { inngest } from "@/lib/inngest/client";
import { scorePersonaAuthenticity } from "@/lib/evals/persona-authenticity";
import { Prisma } from "@prisma/client";

export interface GeneratePersonasParams {
  groupId: string;
  count: number;
  domainContext?: string;
  sourceTypeOverride?: "PROMPT_GENERATED" | "DATA_BASED" | "UPLOAD_BASED";
  templateConfig?: PersonaTemplateConfig;
  onProgress?: (completed: number, total: number, personaName: string) => void;
  /** When set (e.g. from API guard), skips an extra org count query. */
  qualityTier?: PersonaQualityTier;
}

export interface GeneratePersonasResult {
  generated: number;
  errors: string[];
  evaluationsQueued: number;
  authenticity: Array<{
    personaId: string;
    authenticity_score: number;
    authenticity_band: "low" | "medium" | "high";
  }>;
}

type UpbringingType = "urban" | "suburban" | "rural" | "immigrant" | "third-culture";
type SocioEconomicBand =
  | "working-class"
  | "middle-class"
  | "affluent"
  | "financial-instability";
type LifePathType =
  | "career-pivot"
  | "non-linear-education"
  | "self-taught"
  | "career-break";

type PreviousPersonaSummary = {
  name: string;
  archetype: string;
  occupation: string;
  ageBand: string;
  personalityShape: string;
  signature: string;
};

function buildPrompt(params: {
  index: number;
  count: number;
  domainContext?: string;
  ragContext?: string;
  templateConfig?: PersonaTemplateConfig;
  previousPersonas: PreviousPersonaSummary[];
  diversityPlan: {
    upbringing: UpbringingType;
    socioeconomic: SocioEconomicBand;
    lifePath: LifePathType;
  };
  additionalDifferentiation?: string;
}): string {
  const {
    index,
    count,
    domainContext,
    ragContext,
    templateConfig,
    previousPersonas,
    diversityPlan,
    additionalDifferentiation,
  } = params;

  const layers: string[] = [];

  // Layer 1: System Context
  layers.push(
    `You are a demographic simulation engine for user research. Your task is to generate a realistic, psychologically deep synthetic user persona that will be used in synthetic interviews and surveys.

CRITICAL RULES:
- Psychological depth and behavioral specificity matter MORE than demographics
- Every persona must contain at least one internal contradiction (e.g., a tech executive who distrusts apps at home, a young person with old-fashioned values)
- Never link demographics to personality stereotypically (age doesn't determine tech-savviness, gender doesn't determine communication style)
- The backstory must reference specific life events, not generic descriptions
- The representative quote must reveal the persona's unique communication style and voice
- Core values should feel genuinely held, not generic platitudes
- FORBIDDEN CLICHES: never use "small village", "humble beginnings", "always had a passion", "from a young age", "dreamed of success"`
  );

  // Layer 2: Domain Context
  if (domainContext) {
    layers.push(`DOMAIN CONTEXT (the product/service/market these personas are for):\n${domainContext}`);
  }
  if (ragContext) {
    layers.push(`BACKGROUND RESEARCH:\n${ragContext}`);
  }

  // Optional layer: Template constraints (demographics + behavior profile)
  if (templateConfig) {
    const d = templateConfig.demographics;
    const b = templateConfig.behaviorProfile;

    const demographicLines = [
      `Intended template: ${templateConfig.name} — ${templateConfig.description}`,
      `Typical age range: ${d.ageRange.min}-${d.ageRange.max}`,
      d.genderBalance !== "unspecified"
        ? `Typical gender mix: ${d.genderBalance.replace("_", " ")}`
        : undefined,
      d.typicalProfessions?.length
        ? `Typical professions: ${d.typicalProfessions.join(", ")}`
        : undefined,
      d.typicalLocations?.length
        ? `Typical locations: ${d.typicalLocations.join(", ")}`
        : undefined,
    ].filter(Boolean);

    const behaviorLines = [
      `Behavioral profile: ${b.summary}`,
      b.communicationStyle
        ? `Preferred communication style: ${b.communicationStyle}`
        : undefined,
      b.decisionStyle
        ? `Decision-making style: ${b.decisionStyle}`
        : undefined,
      b.riskToleranceHint
        ? `Risk tolerance: ${b.riskToleranceHint}`
        : undefined,
      b.skepticismHint
        ? `Baseline skepticism toward new products: ${b.skepticismHint}`
        : undefined,
      templateConfig.diversityFocus === "focused"
        ? "Diversity focus: keep personas within this segment, but still ensure they are distinct from each other."
        : "Diversity focus: cover a broad range of archetypes within this segment."
    ].filter(Boolean);

    layers.push(
      `TEMPLATE CONSTRAINTS:\n${demographicLines.join(
        "\n"
      )}\n\nBEHAVIORAL INTENT:\n${behaviorLines.join(
        "\n"
      )}\n\nPersonas MUST belong to this segment. Do not drift into unrelated demographics or roles, but ensure each persona is still unique.`
    );
  }

  // Layer 3: Diversity & Anti-Sycophancy Constraints
  const diversityInstructions = [
    `This is persona ${index + 1} of ${count}.`,
    "Vary age, gender, location, occupation, and personality traits INDEPENDENTLY of each other.",
    "Ensure the Big Five personality scores create a unique profile — do NOT cluster around the middle (0.4-0.6).",
    "Avoid near-duplicates: each persona should differ in occupation category, life-stage routine, and relationship to the product.",
    "Create contrast in daily constraints (time pressure, family load, commute style, budget sensitivity, decision authority).",
    "Use distinct archetype wording and avoid adjective reuse from previous personas.",
    `Required upbringing profile for this persona: ${diversityPlan.upbringing}.`,
    `Required socioeconomic context: ${diversityPlan.socioeconomic}.`,
    `Required life-path signal: ${diversityPlan.lifePath}.`,
  ];

  // Anti-sycophancy: ensure some personas are critical/skeptical
  if (count >= 3) {
    if (index < Math.ceil(count * 0.3)) {
      diversityInstructions.push(
        "This persona MUST be a skeptic/critic: set agreeableness below 0.35 and criticalFeedbackTendency above 0.7. They give blunt, honest feedback and don't sugarcoat."
      );
    } else if (index < Math.ceil(count * 0.6)) {
      diversityInstructions.push(
        "This persona should be balanced — neither overly agreeable nor combative. They give measured, thoughtful feedback."
      );
    } else {
      diversityInstructions.push(
        "This persona can be more agreeable and enthusiastic, but should still have specific frustrations and honest opinions."
      );
    }
  }

  layers.push(diversityInstructions.join("\n"));

  // Layer 4: Differentiation Directive
  if (previousPersonas.length > 0) {
    const previousList = previousPersonas
      .map(
        (p) =>
          `- ${p.name} (${p.archetype}) | ${p.occupation} | ${p.ageBand} | profile: ${p.personalityShape}`
      )
      .join("\n");
    layers.push(
      `PREVIOUSLY GENERATED PERSONAS IN THIS BATCH:\n${previousList}\n\nThis persona MUST differ meaningfully from all of the above in archetype wording, occupation category, personality profile shape, and life events. Do NOT repeat similar archetypes or routines.`
    );
  }

  if (additionalDifferentiation) {
    layers.push(`EXTRA DIFFERENTIATION REQUIREMENT:\n${additionalDifferentiation}`);
  }

  // Layer 5: Output Quality Rules
  layers.push(
    `OUTPUT REQUIREMENTS:
- archetype: A memorable 2-4 word label like "The Pragmatic Skeptic", "The Cautious Innovator", "The Empathetic Traditionalist"
- gender: MUST be exactly "Male" or "Female" (no other values)
- representativeQuote: A 1-2 sentence quote this persona would actually say, revealing their voice and perspective
- backstory: 5-7 sentences, include at least two concrete life events and one turning point that shaped today's behavior
- backstory MUST include specific city + country, first job/early work context, and one concrete trade-off (time/money/location)
- dayInTheLife: Exactly 2 short paragraphs that describe routine, context, constraints, and trade-offs in a realistic day
- communicationSample: Write a 2-3 sentence response to "What do you think about trying new technology?" in this persona's authentic voice
- coreValues: 3-5 deeply held values, ranked by importance
- Avoid generic filler such as "has always been passionate", "works hard every day", or repeated stock phrasing across personas
- Writing style: neutral and observational, concise, information-dense, avoid inspirational storytelling tone
- The personality traits should be COHERENT with the backstory and behaviors — a cautious person should have low riskTolerance, a blunt person should have high directness`
  );

  return layers.filter(Boolean).join("\n\n---\n\n");
}

function ageBandFromAge(age: number): string {
  if (age < 26) return "18-25";
  if (age < 36) return "26-35";
  if (age < 46) return "36-45";
  if (age < 56) return "46-55";
  return "56+";
}

function personalityShape(persona: PersonaOutput): string {
  const p = persona.personality;
  const tags: string[] = [];
  if (p.openness > 0.65) tags.push("high-openness");
  if (p.openness < 0.35) tags.push("low-openness");
  if (p.agreeableness > 0.65) tags.push("high-agreeableness");
  if (p.agreeableness < 0.35) tags.push("low-agreeableness");
  if (p.extraversion > 0.65) tags.push("high-extraversion");
  if (p.extraversion < 0.35) tags.push("low-extraversion");
  if (p.neuroticism > 0.65) tags.push("high-neuroticism");
  if (p.neuroticism < 0.35) tags.push("low-neuroticism");
  if (tags.length === 0) tags.push("balanced-profile");
  return tags.slice(0, 3).join(", ");
}

function summaryFromPersona(persona: PersonaOutput): PreviousPersonaSummary {
  const signature = normalizeTokens(
    `${persona.backstory} ${persona.dayInTheLife} ${persona.archetype} ${persona.occupation}`
  )
    .slice(0, 35)
    .join(" ");
  return {
    name: persona.name,
    archetype: persona.archetype,
    occupation: persona.occupation,
    ageBand: ageBandFromAge(persona.age),
    personalityShape: personalityShape(persona),
    signature,
  };
}

function normalizeTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function personalityVector(persona: PersonaOutput): number[] {
  const p = persona.personality;
  return [p.openness, p.conscientiousness, p.extraversion, p.agreeableness, p.neuroticism];
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, idx) => sum + (val - (b[idx] ?? 0)) ** 2, 0));
}

function overlapRatio(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let overlap = 0;
  for (const token of aSet) {
    if (bSet.has(token)) overlap += 1;
  }
  return overlap / Math.min(aSet.size, bSet.size);
}

function buildDifferentiationNudge(candidate: PersonaOutput, prev: PreviousPersonaSummary[]): string | null {
  const archetypeTokens = normalizeTokens(candidate.archetype);
  const occupationTokens = normalizeTokens(candidate.occupation);
  const candidateVector = personalityVector(candidate);
  const close = prev
    .map((p) => {
      const nameArchetypeOverlap = overlapRatio(archetypeTokens, normalizeTokens(p.archetype));
      const occupationOverlap = overlapRatio(occupationTokens, normalizeTokens(p.occupation));
      const pseudoVector = normalizeTokens(p.personalityShape).includes("balanced-profile")
        ? [0.5, 0.5, 0.5, 0.5, 0.5]
        : null;
      const personalityDistance = pseudoVector ? euclideanDistance(candidateVector, pseudoVector) : 1;
      const isTooClose =
        (nameArchetypeOverlap > 0.6 && occupationOverlap > 0.6) ||
        (nameArchetypeOverlap > 0.75 && personalityDistance < 0.45);
      return { p, isTooClose };
    })
    .filter((x) => x.isTooClose)
    .slice(0, 2);

  if (close.length === 0) return null;
  const refs = close
    .map(
      ({ p }) =>
        `${p.name} (${p.archetype}, ${p.occupation}, ${p.ageBand}, ${p.personalityShape})`
    )
    .join("; ");
  return `The previous draft is too similar to: ${refs}. Regenerate with a different occupation category, a different life-stage routine, and a clearly different Big Five profile shape while staying inside the same market context.`;
}

function buildSystemPrompt(persona: PersonaOutput): string {
  const p = persona.personality;

  const trustDesc =
    p.trustPropensity > 0.7
      ? "You tend to trust new products and give them the benefit of the doubt"
      : p.trustPropensity < 0.3
        ? "You are naturally skeptical of new products and marketing claims"
        : "You have moderate trust — you're open but need evidence";

  const directnessDesc =
    p.directness > 0.7
      ? "You are blunt and direct — you say what you think without cushioning it"
      : p.directness < 0.3
        ? "You tend to be indirect, polite, and diplomatic in your communication"
        : "You balance directness with tact";

  const feedbackDesc =
    p.criticalFeedbackTendency > 0.7
      ? "You give brutally honest feedback. If something is bad, you say so clearly."
      : p.criticalFeedbackTendency < 0.3
        ? "You tend to focus on positives and soften criticism"
        : "You give balanced feedback — honest but constructive";

  const emotionalDesc =
    p.emotionalExpressiveness > 0.7
      ? "You express emotions freely and vividly in conversation"
      : p.emotionalExpressiveness < 0.3
        ? "You keep emotions restrained and focus on facts"
        : "You express emotions when they're relevant but stay mostly composed";

  return `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} from ${persona.location}.
Archetype: ${persona.archetype}

PERSONALITY:
- ${trustDesc}
- ${directnessDesc}
- ${feedbackDesc}
- ${emotionalDesc}
- You make decisions in a ${p.decisionMakingStyle} way
- Your risk tolerance is ${p.riskTolerance > 0.6 ? "high — you embrace uncertainty" : p.riskTolerance < 0.4 ? "low — you prefer safe, proven options" : "moderate"}

BACKSTORY: ${persona.backstory}

CURRENT SITUATION: ${persona.dayInTheLife}

CORE VALUES: ${persona.coreValues.join(", ")}

INTERVIEW BEHAVIOR:
- You give ${p.responseLengthTendency} answers
- Your vocabulary is ${p.vocabularyLevel}
- ${p.tangentTendency > 0.6 ? "You sometimes go on tangents and share stories" : p.tangentTendency < 0.3 ? "You stay tightly on topic" : "You mostly stay on topic but occasionally share relevant anecdotes"}
- ${p.directness > 0.5 ? "When you don't care about something, you say so" : "You try to engage with all topics even if they're not your priority"}

CRITICAL: Be authentic to your character. Do NOT be unnecessarily positive or agreeable.
If you wouldn't care about a feature, say so. If something frustrates you, express it in your natural style.
If you're skeptical, be skeptical. If you don't understand something, say you don't understand.`;
}

function computeQualityScore(persona: PersonaOutput): number {
  const repeatedNarrativePenalty = hasRepetitiveNarrative(persona.backstory, persona.dayInTheLife);
  let score = 0;
  const checks = [
    persona.name.length > 2,
    persona.age >= 18 && persona.age <= 100,
    persona.gender.length > 0,
    persona.location.length > 3,
    persona.occupation.length > 3,
    persona.bio.length > 50,
    persona.backstory.length > 320,
    countSentences(persona.backstory) >= 5,
    persona.goals.length >= 2,
    persona.frustrations.length >= 2,
    persona.behaviors.length >= 2,
    persona.archetype.length > 3,
    persona.representativeQuote.length > 10,
    persona.dayInTheLife.length > 220,
    countParagraphs(persona.dayInTheLife) >= 2,
    persona.coreValues.length >= 3,
    persona.communicationSample.length > 20,
    // Personality traits not all clustered in the middle
    Math.abs(persona.personality.openness - 0.5) > 0.15 ||
      Math.abs(persona.personality.agreeableness - 0.5) > 0.15,
    !repeatedNarrativePenalty,
  ];
  score = checks.filter(Boolean).length / checks.length;
  return Math.round(score * 100) / 100;
}

function countSentences(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function countParagraphs(text: string): number {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

function hasRepetitiveNarrative(backstory: string, dayInTheLife: string): boolean {
  const combined = `${backstory} ${dayInTheLife}`.toLowerCase();
  const weakPhrases = [
    "has always been passionate",
    "works hard every day",
    "in today's fast-paced world",
    "a typical day starts",
    "balances work and life",
  ];
  return weakPhrases.filter((phrase) => combined.includes(phrase)).length >= 2;
}

function buildBatchDiversityPlan(count: number) {
  const upbringingPool: UpbringingType[] = [
    "urban",
    "suburban",
    "immigrant",
    "third-culture",
    "urban",
    "suburban",
  ];
  const maxRural = Math.max(1, Math.floor(count * 0.15));
  for (let i = 0; i < maxRural; i++) upbringingPool.push("rural");

  const socioeconomicPool: SocioEconomicBand[] = [
    "working-class",
    "middle-class",
    "affluent",
    "financial-instability",
  ];
  const lifePathPool: LifePathType[] = [
    "career-pivot",
    "non-linear-education",
    "self-taught",
    "career-break",
  ];

  return Array.from({ length: count }, (_, index) => ({
    upbringing: upbringingPool[index % upbringingPool.length],
    socioeconomic: socioeconomicPool[index % socioeconomicPool.length],
    lifePath: lifePathPool[index % lifePathPool.length],
  }));
}

function containsForbiddenTropes(text: string): boolean {
  const normalized = text.toLowerCase();
  const forbidden = [
    "small village",
    "humble beginnings",
    "always had a passion",
    "from a young age",
    "dreamed of success",
  ];
  return forbidden.some((phrase) => normalized.includes(phrase));
}

function jaccard(a: string[], b: string[]) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (!sa.size || !sb.size) return 0;
  let overlap = 0;
  for (const token of sa) {
    if (sb.has(token)) overlap += 1;
  }
  return overlap / new Set([...sa, ...sb]).size;
}

function isTooSimilarToBatch(candidate: PersonaOutput, previous: PreviousPersonaSummary[]) {
  if (previous.length === 0) return false;
  const candidateTokens = normalizeTokens(
    `${candidate.backstory} ${candidate.dayInTheLife} ${candidate.archetype} ${candidate.occupation}`
  );
  return previous.some((entry) => jaccard(candidateTokens, normalizeTokens(entry.signature)) > 0.46);
}

export async function generateAndSavePersonas(
  params: GeneratePersonasParams
): Promise<GeneratePersonasResult> {
  const { groupId, count, domainContext, sourceTypeOverride, templateConfig, onProgress } =
    params;

  let qualityTier = params.qualityTier;
  if (qualityTier == null) {
    const g = await prisma.personaGroup.findUnique({
      where: { id: groupId },
      select: { organizationId: true },
    });
    if (!g) {
      throw new Error("Persona group not found");
    }
    const orgCount = await countPersonasForOrganization(g.organizationId);
    qualityTier = qualityTierFromOrgPersonaCount(orgCount);
  }
  const personaModel = getPersonaGenerationModel(qualityTier);

  // Load domain knowledge for RAG context (with provenance tracking)
  const knowledge = await prisma.domainKnowledge.findMany({
    where: { personaGroupId: groupId },
    take: 20,
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
  });
  const nonAppReviewKnowledgeIds = knowledge
    .filter((k) => k.sourceType !== "APP_REVIEW")
    .map((k) => k.id);
  const ragContext = knowledge.length
    ? knowledge
        .map((k) => {
          const source = k.sourceDomain ? ` [${k.sourceDomain}]` : "";
          const date = k.publishedAt
            ? ` (${k.publishedAt.toISOString().slice(0, 10)})`
            : "";
          return `${k.title}${source}${date}:\n${k.content}`;
        })
        .join("\n\n---\n\n")
    : undefined;
  const sourceType = sourceTypeOverride ?? (knowledge.length > 0 ? "DATA_BASED" : "PROMPT_GENERATED");

  const previousPersonas: PreviousPersonaSummary[] = [];
  const diversityPlan = buildBatchDiversityPlan(count);
  const errors: string[] = [];
  let generated = 0;
  let evaluationsQueued = 0;
  const authenticity: GeneratePersonasResult["authenticity"] = [];

  for (let i = 0; i < count; i++) {
    try {
      let persona: PersonaOutput | null = null;
      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const prompt = buildPrompt({
          index: i,
          count,
          domainContext,
          ragContext,
          templateConfig,
          previousPersonas,
          diversityPlan: diversityPlan[i],
          additionalDifferentiation:
            attempt > 0
              ? "Previous draft was too generic or too similar. Regenerate with a clearly different upbringing context, life events, and wording."
              : undefined,
        });
        const { object: draft } = await generateObject({
          model: personaModel,
          schema: personaSchema,
          prompt,
        });
        const tooGeneric = containsForbiddenTropes(`${draft.backstory} ${draft.dayInTheLife}`);
        const tooSimilar = isTooSimilarToBatch(draft, previousPersonas);
        const nudge = buildDifferentiationNudge(draft, previousPersonas);
        if (!tooGeneric && !tooSimilar && !nudge) {
          persona = draft;
          break;
        }
        if (attempt === MAX_ATTEMPTS - 1) {
          persona = draft;
        }
      }
      if (!persona) {
        throw new Error("Unable to generate non-repetitive persona after retries");
      }

      const qualityScore = computeQualityScore(persona);
      const llmSystemPrompt = buildSystemPrompt(persona);
      const recentPersonas = await prisma.persona.findMany({
        where: { personaGroupId: groupId, isActive: true },
        select: { backstory: true, dayInTheLife: true, archetype: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      let authenticityEval;
      try {
        authenticityEval = await scorePersonaAuthenticity(persona, recentPersonas);
      } catch (error) {
        console.error("[generate-personas] authenticity evaluation failed:", error);
        authenticityEval = {
          authenticity_score: 60,
          authenticity_band: "medium" as const,
          eval_summary:
            "Authenticity evaluation was unavailable for this run; persona was generated successfully.",
          eval_dimensions: {
            specificity: 60,
            plausibility: 60,
            non_genericity: 60,
            consistency: 60,
            diversity: 60,
          },
          flags: ["low_specificity"],
          evalRaw: {
            fallback: true,
            reason:
              error instanceof Error ? error.message : "unknown authenticity evaluator error",
          },
          backstoryEmbedding: [],
        };
      }

      const createdPersona = await prisma.persona.create({
        data: {
          personaGroupId: groupId,
          name: persona.name,
          age: persona.age,
          gender: persona.gender,
          location: persona.location,
          occupation: persona.occupation,
          bio: persona.bio,
          backstory: persona.backstory,
          goals: persona.goals,
          frustrations: persona.frustrations,
          behaviors: persona.behaviors,
          sourceType,
          qualityScore,
          generatedContent: persona,
          rawInput: {
            domainContext: domainContext ?? null,
            ragContextPresent: Boolean(ragContext),
            templateId: templateConfig?.id ?? null,
            qualityTier,
          },
          normalizedText: [
            persona.name,
            persona.archetype,
            persona.bio,
            persona.backstory,
            persona.dayInTheLife,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          authenticityScore: authenticityEval.authenticity_score,
          authenticityBand: authenticityEval.authenticity_band,
          evalSummary: authenticityEval.eval_summary,
          evalDimensions: authenticityEval.eval_dimensions as unknown as Prisma.InputJsonValue,
          evalFlags: authenticityEval.flags as unknown as Prisma.InputJsonValue,
          evalVersion: "persona-auth-v1",
          evalRaw: authenticityEval.evalRaw as Prisma.InputJsonValue,
          backstoryEmbeddingJson:
            authenticityEval.backstoryEmbedding as unknown as Prisma.InputJsonValue,
          evaluationStatus: "PENDING",
          llmSystemPrompt,
          archetype: persona.archetype,
          representativeQuote: persona.representativeQuote,
          techLiteracy: persona.techLiteracy,
          domainExpertise: persona.domainExpertise,
          dayInTheLife: persona.dayInTheLife,
          coreValues: persona.coreValues,
          communicationSample: persona.communicationSample,
          personality: {
            create: {
              openness: persona.personality.openness,
              conscientiousness: persona.personality.conscientiousness,
              extraversion: persona.personality.extraversion,
              agreeableness: persona.personality.agreeableness,
              neuroticism: persona.personality.neuroticism,
              communicationStyle: persona.personality.communicationStyle,
              responseLengthTendency: persona.personality.responseLengthTendency,
              decisionMakingStyle: persona.personality.decisionMakingStyle,
              riskTolerance: persona.personality.riskTolerance,
              trustPropensity: persona.personality.trustPropensity,
              emotionalExpressiveness: persona.personality.emotionalExpressiveness,
              directness: persona.personality.directness,
              criticalFeedbackTendency: persona.personality.criticalFeedbackTendency,
              vocabularyLevel: persona.personality.vocabularyLevel,
              tangentTendency: persona.personality.tangentTendency,
            },
          },
        },
      });

      if (nonAppReviewKnowledgeIds.length > 0) {
        await prisma.personaDataSource.createMany({
          data: nonAppReviewKnowledgeIds.map((dkId) => ({
            personaId: createdPersona.id,
            domainKnowledgeId: dkId,
          })),
          skipDuplicates: true,
        });
      }

      previousPersonas.push(summaryFromPersona(persona));
      generated++;
      onProgress?.(generated, count, persona.name);

      await inngest.send({
        name: "persona/evaluate.requested",
        data: { personaId: createdPersona.id },
      });
      evaluationsQueued++;
      authenticity.push({
        personaId: createdPersona.id,
        authenticity_score: authenticityEval.authenticity_score,
        authenticity_band: authenticityEval.authenticity_band,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Persona ${i + 1}: ${message}`);
      console.error(`[generate-personas] Failed:`, error);
    }
  }

  // Update group persona count with actual DB count
  const actualCount = await prisma.persona.count({
    where: { personaGroupId: groupId, isActive: true },
  });
  await prisma.personaGroup.update({
    where: { id: groupId },
    data: { personaCount: actualCount },
  });

  if (actualCount > 0) {
    try {
      await assignAppStoreReviewsToPersonas(groupId);
    } catch (e) {
      console.error(
        "[generate-personas] assignAppStoreReviewsToPersonas failed:",
        e
      );
    }
  }

  return { generated, errors, evaluationsQueued, authenticity };
}
