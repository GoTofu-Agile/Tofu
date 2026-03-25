import { generateObject } from "ai";
import { getModel } from "./provider";
import { personaSchema, type PersonaOutput } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";
import type { PersonaTemplateConfig } from "@/lib/personas/templates";
import { assignAppStoreReviewsToPersonas } from "@/lib/personas/assign-app-store-reviews";

export interface GeneratePersonasParams {
  groupId: string;
  count: number;
  domainContext?: string;
  sourceTypeOverride?: "PROMPT_GENERATED" | "DATA_BASED" | "UPLOAD_BASED";
  templateConfig?: PersonaTemplateConfig;
  onProgress?: (completed: number, total: number, personaName: string) => void;
}

export interface GeneratePersonasResult {
  generated: number;
  errors: string[];
}

function buildPrompt(params: {
  index: number;
  count: number;
  domainContext?: string;
  ragContext?: string;
  templateConfig?: PersonaTemplateConfig;
  previousPersonas: { name: string; archetype: string }[];
}): string {
  const { index, count, domainContext, ragContext, templateConfig, previousPersonas } = params;

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
- Core values should feel genuinely held, not generic platitudes`
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
      .map((p) => `- ${p.name} (${p.archetype})`)
      .join("\n");
    layers.push(
      `PREVIOUSLY GENERATED PERSONAS IN THIS BATCH:\n${previousList}\n\nThis persona MUST differ meaningfully from all of the above in archetype, personality profile, and backstory. Do NOT repeat similar archetypes.`
    );
  }

  // Layer 5: Output Quality Rules
  layers.push(
    `OUTPUT REQUIREMENTS:
- archetype: A memorable 2-4 word label like "The Pragmatic Skeptic", "The Cautious Innovator", "The Empathetic Traditionalist"
- representativeQuote: A 1-2 sentence quote this persona would actually say, revealing their voice and perspective
- backstory: At least 3 sentences with specific life events and turning points
- dayInTheLife: A vivid paragraph describing a typical day
- communicationSample: Write a 2-3 sentence response to "What do you think about trying new technology?" in this persona's authentic voice
- coreValues: 3-5 deeply held values, ranked by importance
- The personality traits should be COHERENT with the backstory and behaviors — a cautious person should have low riskTolerance, a blunt person should have high directness`
  );

  return layers.filter(Boolean).join("\n\n---\n\n");
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
  let score = 0;
  const checks = [
    persona.name.length > 2,
    persona.age >= 18 && persona.age <= 100,
    persona.gender.length > 0,
    persona.location.length > 3,
    persona.occupation.length > 3,
    persona.bio.length > 50,
    persona.backstory.length > 150,
    persona.goals.length >= 2,
    persona.frustrations.length >= 2,
    persona.behaviors.length >= 2,
    persona.archetype.length > 3,
    persona.representativeQuote.length > 10,
    persona.dayInTheLife.length > 50,
    persona.coreValues.length >= 3,
    persona.communicationSample.length > 20,
    // Personality traits not all clustered in the middle
    Math.abs(persona.personality.openness - 0.5) > 0.15 ||
      Math.abs(persona.personality.agreeableness - 0.5) > 0.15,
  ];
  score = checks.filter(Boolean).length / checks.length;
  return Math.round(score * 100) / 100;
}

export async function generateAndSavePersonas(
  params: GeneratePersonasParams
): Promise<GeneratePersonasResult> {
  const { groupId, count, domainContext, sourceTypeOverride, templateConfig, onProgress } =
    params;

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

  const previousPersonas: { name: string; archetype: string }[] = [];
  const errors: string[] = [];
  let generated = 0;

  for (let i = 0; i < count; i++) {
    try {
      const prompt = buildPrompt({
        index: i,
        count,
        domainContext,
        ragContext,
        templateConfig,
        previousPersonas,
      });

      const { object: persona } = await generateObject({
        model: getModel(),
        schema: personaSchema,
        prompt,
      });

      const qualityScore = computeQualityScore(persona);
      const llmSystemPrompt = buildSystemPrompt(persona);

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

      // Link persona to non–App-Store RAG sources only; App Store reviews are
      // assigned per-persona after generation via assignAppStoreReviewsToPersonas.
      if (nonAppReviewKnowledgeIds.length > 0) {
        await prisma.personaDataSource.createMany({
          data: nonAppReviewKnowledgeIds.map((dkId) => ({
            personaId: createdPersona.id,
            domainKnowledgeId: dkId,
          })),
          skipDuplicates: true,
        });
      }

      previousPersonas.push({
        name: persona.name,
        archetype: persona.archetype,
      });
      generated++;
      onProgress?.(generated, count, persona.name);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`Persona ${i + 1}: ${message}`);
      console.error(`[generate-personas] Failed persona ${i + 1}:`, error);
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

  return { generated, errors };
}
