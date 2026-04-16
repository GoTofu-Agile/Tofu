import { generateObject } from "ai";
import { getPersonaGenerationModel } from "./provider";
import { qualityTierFromOrgPersonaCount, type PersonaQualityTier } from "@/lib/personas/persona-creation-policy";
import { countPersonasForOrganization } from "@/lib/db/queries/personas";
import { personaSchema, type PersonaOutput } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";
import type { PersonaTemplateConfig } from "@/lib/personas/templates";
import { assignAppStoreReviewsToPersonas } from "@/lib/personas/assign-app-store-reviews";
import { inngest } from "@/lib/inngest/client";
import {
  scorePersonaAuthenticity,
  scorePersonaAuthenticityHeuristic,
  type PersonaAuthenticityResult,
} from "@/lib/evals/persona-authenticity";
import { assembleTurboPersona } from "@/lib/personas/persona-building-blocks";
import { Prisma } from "@prisma/client";

export type PersonaGenerationSpeedMode = "quality" | "fast" | "turbo";

export interface GeneratePersonasParams {
  groupId: string;
  count: number;
  domainContext?: string;
  sourceTypeOverride?: "PROMPT_GENERATED" | "DATA_BASED" | "UPLOAD_BASED";
  templateConfig?: PersonaTemplateConfig;
  includeSkeptics?: boolean;
  /**
   * quality: sequential generation, full prompts, LLM authenticity judge (slowest, richest).
   * fast: parallel LLM generation, compact prompts, heuristic authenticity (default).
   * turbo: template assembly only, no persona LLM (sub-second per persona).
   */
  speedMode?: PersonaGenerationSpeedMode;
  onProgress?: (
    completed: number,
    total: number,
    personaName: string,
    personaId: string
  ) => void;
  /** Fires when the LLM draft is ready, before DB write (fast / quality). */
  onPartial?: (p: { index: number; name: string; archetype: string; age: number }) => void;
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

/** Richness instructions for one-shot generation (no second LLM call). */
function singleCallRealismBlock(): string {
  return `SINGLE-CALL REALISM — two mental passes, emit ONE JSON object only:
PHASE 1 — Draft a persona that satisfies every schema field.
PHASE 2 — Tighten before output: humanize voice; weave 1–2 subtle INNER CONTRADICTIONS through backstory and dayInTheLife (show the tension, never prefix with "contradiction:"). Slightly degrade "AI polish" in representativeQuote and communicationSample (natural fragments, uneven length, not brochure tone).

ENVIRONMENT & ROUTINE: Ground location in lived detail—commute mode, neighborhood texture, rent/time pressure, one job-specific ritual (standup, site walk, clinic triage, etc.).

BEHAVIORS (3–7 strings): Observable micro-actions only—what a camera would see. FORBIDDEN as standalone behaviors: friendly, hardworking, funny, passionate, driven, resilient, team player, people person, detail-oriented, proactive.

MEMORY ANCHORS: formativeExperiences = two concrete past episodes (specific people/places/outcomes). recurringHabit = one repeating behavior. opinions = 1–3 spiky, specific stances (not "quality matters").

COMMUNICATION FINGERPRINT: One paragraph describing their real writing/speech—sentence length mix, punctuation habits, emoji policy (none / rare / ironic), hedging vs bluntness. Quotes and communicationSample must demonstrate it.

IMPERFECTION: cognitiveBiasOrIrrationalStreak = mild human mess—unfair preference, superstition, grudge, or inconsistency that coexists with their competence.

SELF-CHECK: Set authenticitySelfScore and relatabilityScore honestly (40–100). If the persona still reads like a LinkedIn summary, mentally revise once for specificity and asymmetry, then output the final JSON only.`;
}

async function generatePersonaObject(params: {
  model: ReturnType<typeof getPersonaGenerationModel>;
  prompt: string;
  label: string;
}): Promise<PersonaOutput> {
  try {
    const { object } = await generateObject({
      model: params.model,
      schema: personaSchema,
      prompt: params.prompt,
    });
    return object;
  } catch (error) {
    console.error(`[generate-personas] structured generation failed [${params.label}]:`, error);
    throw error;
  }
}

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
  includeSkeptics?: boolean;
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
    includeSkeptics,
  } = params;

  const layers: string[] = [];

  // Layer 1: System Context
  layers.push(
    `You are a demographic simulation engine for user research. Your task is to generate a realistic, psychologically deep synthetic user persona that will be used in synthetic interviews and surveys.

CRITICAL RULES:
- Psychological depth and behavioral specificity matter MORE than demographics
- NEVER use trait labels: forbidden words in behaviors/quirks/contradictions include "friendly", "hardworking", "funny", "passionate", "detail-oriented", "driven". Instead SHOW behavior: "replies to messages hours later but always writes three paragraphs" is acceptable; "friendly" is not.
- Every persona MUST include 1-2 organic internal contradictions — these are the #1 signal of realism. Examples: "loudly advocates for work-life balance but checks Slack at midnight", "claims to hate social media but has 4 active accounts", "lectures others about frugality but impulse-buys gadgets monthly".
- The backstory MUST include a specific city + country, at least one job/early-career detail, and one concrete trade-off (time vs money, career vs family, location vs opportunity).
- Inject city-level lifestyle texture: local commute reality, neighborhood vibe, cost-of-living pressure, or regional cultural norm. Not "lives in a big city" — "takes the 8:12 tram from Peckham and arrives 11 minutes late to every morning stand-up".
- Memory anchors: reference 2 past experiences and 1 recurring habit that CAUSALLY explain current behaviors — not as decoration.
- communicationFingerprint MUST describe specific linguistic idiosyncrasies: average sentence length, punctuation habits, word choices, emoji use or deliberate avoidance, filler words, what they never say. Generic descriptions like "professional and clear" are forbidden.
- Humans are not logically clean: introduce mild bias, one irrational preference, one inconsistency that doesn't resolve neatly.
- Never link demographics to personality stereotypically (age doesn't determine tech-savviness, gender doesn't determine communication style).
- FORBIDDEN CLICHES: never use "small village", "humble beginnings", "always had a passion", "from a young age", "dreamed of success"`
  );

  // Layer 2: Domain Context
  if (domainContext) {
    layers.push(`DOMAIN CONTEXT (the product/service/market these personas are for):\n${domainContext}`);
  }
  if (ragContext) {
    layers.push(`BACKGROUND RESEARCH:\n${ragContext}`);
    layers.push(
      "GROUNDING CONSTRAINTS:\n" +
        "- Anchor persona details to the background research evidence.\n" +
        "- Do not fabricate specific employers, credentials, or demographics unless they are implied by evidence.\n" +
        "- Prefer conservative phrasing over invented precision when evidence is limited."
    );
  }
  if (includeSkeptics === false) {
    layers.push(
      "AUDIENCE TONALITY:\n" +
        "- Keep personas broadly solution-positive and less skeptical than average.\n" +
        "- Avoid defaulting to distrustful or cynical responses unless strongly supported by evidence."
    );
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
  // Cap at last 5 — earlier personas are already encoded in the diversity plan
  // and adding them all grows context linearly (800+ tokens by persona #20)
  if (previousPersonas.length > 0) {
    const recent = previousPersonas.slice(-5);
    const previousList = recent
      .map(
        (p) =>
          `- ${p.name} (${p.archetype}) | ${p.occupation} | ${p.ageBand} | profile: ${p.personalityShape}`
      )
      .join("\n");
    layers.push(
      `PREVIOUSLY GENERATED PERSONAS IN THIS BATCH (last ${recent.length}):\n${previousList}\n\nThis persona MUST differ meaningfully from all of the above in archetype wording, occupation category, personality profile shape, and life events. Do NOT repeat similar archetypes or routines.`
    );
  }

   if (additionalDifferentiation) {
    layers.push(`EXTRA DIFFERENTIATION REQUIREMENT:\n${additionalDifferentiation}`);
  }

  layers.push(singleCallRealismBlock());

  // Layer 5: Output Quality Rules
  layers.push(
    `OUTPUT REQUIREMENTS:

FIELD-LEVEL RULES:
- archetype: A memorable 2-4 word label like "The Pragmatic Skeptic", "The Cautious Innovator", "The Empathetic Traditionalist"
- gender: MUST be exactly "Male" or "Female" (no other values)
- representativeQuote: A 1-2 sentence quote this persona would actually say, revealing their voice and perspective
- backstory: 5-7 sentences, include at least two concrete life events and one turning point that shaped today's behavior
- backstory MUST include specific city + country, first job/early work context, and one concrete trade-off (time/money/location)
- dayInTheLife: Exactly 2 short paragraphs that describe routine, context, constraints, and trade-offs in a realistic day
- communicationSample: Write a 2-3 sentence response to "What do you think about trying new technology?" in this persona's authentic voice
- coreValues: 3-5 deeply held values, ranked by importance
- behaviors: 3–7 strings, each an observable habit/action (see SINGLE-CALL REALISM)
- formativeExperiences: exactly two strings, specific episodic memories
- recurringHabit, contradictions (1–2), habits, opinions, quirks: all concrete; contradictions must feel psychologically plausible together
- communicationFingerprint: paragraph as specified above
- cognitiveBiasOrIrrationalStreak: one specific human imperfection
- authenticitySelfScore, relatabilityScore: integers 40–100 from self-check
- Avoid generic filler such as "has always been passionate", "works hard every day", or repeated stock phrasing across personas
- Writing style: neutral and observational, concise, information-dense, avoid inspirational storytelling tone
- The personality traits should be COHERENT with the backstory and behaviors — a cautious person should have low riskTolerance, a blunt person should have high directness`
  );

  return layers.filter(Boolean).join("\n\n---\n\n");
}

/** Compact prompt for fast mode: same schema, fewer tokens. */
function buildPromptFast(params: {
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
  includeSkeptics?: boolean;
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
    includeSkeptics,
  } = params;

  const lines: string[] = [
    "Generate one realistic synthetic persona for user research. Output must match the JSON schema exactly.",
    `Slot ${index + 1} of ${count}.`,
    "Constraints: concrete life events; one internal contradiction; no forbidden clichés (small village, humble beginnings, always passionate, from a young age, dreamed of success).",
    "gender: exactly Male or Female. archetype: memorable 2–4 words.",
    "Big Five: avoid clustering 0.45–0.55 on every trait; make a distinct shape.",
    `Required: upbringing=${diversityPlan.upbringing}; socioeconomic=${diversityPlan.socioeconomic}; life-path=${diversityPlan.lifePath}.`,
  ];

  if (domainContext) lines.push(`DOMAIN:\n${domainContext}`);
  if (ragContext) {
    const cap = ragContext.length > 8000 ? `${ragContext.slice(0, 8000)}\n…` : ragContext;
    lines.push(`EVIDENCE (ground claims; do not invent employers/credentials not implied):\n${cap}`);
  }
  if (includeSkeptics === false) {
    lines.push("Audience tone: broadly solution-positive; avoid default cynicism.");
  }
  if (templateConfig) {
    const d = templateConfig.demographics;
    lines.push(
      `SEGMENT: ${templateConfig.name} — ${templateConfig.description}\nTypical age ${d.ageRange.min}-${d.ageRange.max}. ${templateConfig.behaviorProfile.summary}`
    );
  }
  if (previousPersonas.length > 0) {
    lines.push(
      `DIFFER from existing batch/DB snapshots:\n${previousPersonas
        .map((p) => `- ${p.name} | ${p.archetype} | ${p.occupation} | ${p.ageBand}`)
        .join("\n")}`
    );
  }
  if (additionalDifferentiation) lines.push(`EXTRA: ${additionalDifferentiation}`);

  lines.push(singleCallRealismBlock());

  lines.push(
    "Narrative: backstory 5–7 sentences (city+country, early job, trade-off, turning point). dayInTheLife: 2 short paragraphs with commute/neighborhood/job-site texture. representativeQuote + communicationSample: show communicationFingerprint (imperfect rhythm OK). coreValues: 3–5 ranked. bio: concise."
  );
  lines.push(
    "Required JSON extras: formativeExperiences[2], recurringHabit, contradictions[1–2], habits[2–4], opinions[1–3], quirks[2–5], communicationFingerprint, cognitiveBiasOrIrrationalStreak, authenticitySelfScore, relatabilityScore. behaviors: 3–7 observable actions, no trait adjectives."
  );

  return lines.join("\n\n");
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

  const contradictionsSection =
    persona.contradictions?.length > 0
      ? `\nYOUR CONTRADICTIONS (lean into these naturally — do not explain them away):\n${persona.contradictions.map((c) => `- ${c}`).join("\n")}`
      : "";

  const quirksSection =
    persona.quirks?.length > 0
      ? `\nYOUR QUIRKS AND IRRATIONALITIES:\n${persona.quirks.map((q) => `- ${q}`).join("\n")}`
      : "";

  const opinionsSection =
    persona.opinions?.length > 0
      ? `\nSTRONG OPINIONS YOU HOLD:\n${persona.opinions.map((o) => `- ${o}`).join("\n")}`
      : "";

  const habitsSection =
    persona.habits?.length > 0
      ? `\nRECURRING HABITS (reference these when contextually natural):\n${persona.habits.map((h) => `- ${h}`).join("\n")}`
      : "";

  const commFingerprintSection = persona.communicationFingerprint
    ? `\nHOW YOU COMMUNICATE:\n${persona.communicationFingerprint}`
    : "";

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
${contradictionsSection}${quirksSection}${opinionsSection}${habitsSection}${commFingerprintSection}

FORMATIVE EXPERIENCES:
- ${persona.formativeExperiences[0]}
- ${persona.formativeExperiences[1]}

RECURRING HABIT: ${persona.recurringHabit}

CONTRADICTIONS (embody both; don't explain as a list in interviews): ${persona.contradictions.join(" | ")}

HABITS: ${persona.habits.join("; ")}

OPINIONS: ${persona.opinions.join("; ")}

QUIRKS: ${persona.quirks.join("; ")}

OBSERVABLE BEHAVIORS: ${persona.behaviors.join("; ")}

COMMUNICATION FINGERPRINT: ${persona.communicationFingerprint}

HUMAN IMPERFECTION / BIAS: ${persona.cognitiveBiasOrIrrationalStreak}

INTERVIEW BEHAVIOR:
- You give ${p.responseLengthTendency} answers
- Your vocabulary is ${p.vocabularyLevel}
- ${p.tangentTendency > 0.6 ? "You sometimes go on tangents and share stories" : p.tangentTendency < 0.3 ? "You stay tightly on topic" : "You mostly stay on topic but occasionally share relevant anecdotes"}
- ${p.directness > 0.5 ? "When you don't care about something, you say so" : "You try to engage with all topics even if they're not your priority"}

CRITICAL: Be authentic to your character. Do NOT be unnecessarily positive or agreeable.
If you wouldn't care about a feature, say so. If something frustrates you, express it in your natural style.
If you're skeptical, be skeptical. If you don't understand something, say you don't understand.
Your contradictions and quirks are part of who you are — do not smooth them out.`;
}

function computeQualityScore(persona: PersonaOutput): number {
  const repeatedNarrativePenalty = hasRepetitiveNarrative(persona.backstory, persona.dayInTheLife);
  let score = 0;
  const traitWord =
    /\b(friendly|hardworking|funny|passionate|driven|resilient|people person|team player|detail-oriented|proactive)\b/i;
  const behaviorsSpecific =
    persona.behaviors.length >= 3 && persona.behaviors.every((b) => b.length >= 18 && !traitWord.test(b));

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
    behaviorsSpecific,
    persona.contradictions.length >= 1,
    persona.formativeExperiences[0].length >= 20 && persona.formativeExperiences[1].length >= 20,
    persona.communicationFingerprint.length >= 35,
    persona.cognitiveBiasOrIrrationalStreak.length >= 18,
    persona.authenticitySelfScore >= 50,
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
    // Authenticity-depth fields
    persona.contradictions?.length >= 1,
    persona.habits?.length >= 1,
    persona.opinions?.length >= 1,
    persona.quirks?.length >= 2,
    (persona.communicationFingerprint?.length ?? 0) > 30,
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
    `${candidate.backstory} ${candidate.dayInTheLife} ${candidate.archetype} ${candidate.occupation} ${candidate.contradictions.join(" ")} ${candidate.formativeExperiences.join(" ")}`
  );
  return previous.some((entry) => jaccard(candidateTokens, normalizeTokens(entry.signature)) > 0.46);
}

type RecentPersonaCorpusRow = {
  name: string;
  backstory: string | null;
  dayInTheLife: string | null;
  archetype: string | null;
  occupation: string | null;
};

function previousSummariesFromDbCorpus(rows: RecentPersonaCorpusRow[]): PreviousPersonaSummary[] {
  return rows.map((p) => ({
    name: p.name,
    archetype: p.archetype ?? "",
    occupation: p.occupation ?? "",
    ageBand: "",
    personalityShape: "",
    signature: normalizeTokens(
      `${p.backstory ?? ""} ${p.dayInTheLife ?? ""} ${p.archetype ?? ""} ${p.occupation}`
    )
      .slice(0, 35)
      .join(" "),
  }));
}

export async function generateAndSavePersonas(
  params: GeneratePersonasParams
): Promise<GeneratePersonasResult> {
  const {
    groupId,
    count,
    domainContext,
    sourceTypeOverride,
    templateConfig,
    includeSkeptics = true,
    onProgress,
    onPartial,
    speedMode: speedModeParam,
  } = params;
  const speedMode: PersonaGenerationSpeedMode = speedModeParam ?? "fast";
  const startedAt = Date.now();
  const timingsMs: Record<string, number> = {};

  let qualityTier = params.qualityTier;
  const tTier = Date.now();
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
  timingsMs.resolveTierMs = Date.now() - tTier;

  const personaModelQuality = getPersonaGenerationModel(qualityTier);
  const personaModelFast = getPersonaGenerationModel(1);

  const tLoad = Date.now();
  const [knowledge, recentRows] = await Promise.all([
    prisma.domainKnowledge.findMany({
      where: { personaGroupId: groupId },
      take: 20,
      orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    }),
    prisma.persona.findMany({
      where: { personaGroupId: groupId, isActive: true },
      select: {
        name: true,
        backstory: true,
        dayInTheLife: true,
        archetype: true,
        occupation: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  timingsMs.parallelLoadMs = Date.now() - tLoad;

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

  const recentPersonas: RecentPersonaCorpusRow[] = recentRows.map((r) => ({
    name: r.name,
    backstory: r.backstory,
    dayInTheLife: r.dayInTheLife,
    archetype: r.archetype,
    occupation: r.occupation,
  }));

  type PendingPersona = {
    persona: PersonaOutput;
    scorePromise: Promise<PersonaAuthenticityResult>;
    qualityScore: number;
    llmSystemPrompt: string;
  };

  const inngestPersonaIds: string[] = [];
  // Pending list for the pipeline: evals start while the next micro-batch generates
  const pendingItems: PendingPersona[] = [];

  const flushPending = async () => {
    for (const p of pendingItems) {
      try { await savePendingPersona(p); } catch (e) {
        errors.push(`Save error: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
    pendingItems.length = 0;
  };

  const rawInputBase = {
    domainContext: domainContext ?? null,
    ragContextPresent: Boolean(ragContext),
    templateId: templateConfig?.id ?? null,
    qualityTier,
    speedMode,
  };

  const persistPersona = async (
    persona: PersonaOutput,
    authenticityEval: PersonaAuthenticityResult,
    qualityScore: number,
    llmSystemPrompt: string
  ) => {
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
        rawInput: rawInputBase as unknown as Prisma.InputJsonValue,
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

    inngestPersonaIds.push(createdPersona.id);
    generated++;
    authenticity.push({
      personaId: createdPersona.id,
      authenticity_score: authenticityEval.authenticity_score,
      authenticity_band: authenticityEval.authenticity_band,
    });
    onProgress?.(generated, count, persona.name, createdPersona.id);
  };

  const savePendingPersona = async (p: PendingPersona) => {
    let authenticityEval: PersonaAuthenticityResult;
    try {
      authenticityEval = await p.scorePromise;
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
          reason: error instanceof Error ? error.message : "unknown authenticity evaluator error",
        },
        backstoryEmbedding: [],
      };
    }
    await persistPersona(
      p.persona,
      authenticityEval,
      p.qualityScore,
      p.llmSystemPrompt
    );
  };

  if (speedMode === "turbo") {
    const tTurbo = Date.now();
    const dbCorpusForScoring = recentPersonas.map((r) => ({
      backstory: r.backstory,
      dayInTheLife: r.dayInTheLife,
      archetype: r.archetype,
    }));
    for (let i = 0; i < count; i++) {
      try {
        const persona = assembleTurboPersona({
          groupId,
          index: i,
          count,
          domainContext,
          templateConfig,
          upbringing: diversityPlan[i].upbringing,
          socioeconomic: diversityPlan[i].socioeconomic,
          lifePath: diversityPlan[i].lifePath,
        });
        onPartial?.({ index: i, name: persona.name, archetype: persona.archetype, age: persona.age });
        const authenticityEval = await scorePersonaAuthenticityHeuristic(persona, dbCorpusForScoring);
        await persistPersona(
          persona,
          authenticityEval,
          computeQualityScore(persona),
          buildSystemPrompt(persona)
        );
        previousPersonas.push(summaryFromPersona(persona));
        recentPersonas.unshift({
          name: persona.name,
          backstory: persona.backstory,
          dayInTheLife: persona.dayInTheLife,
          archetype: persona.archetype,
          occupation: persona.occupation,
        });
        if (recentPersonas.length > 20) recentPersonas.length = 20;
        dbCorpusForScoring.unshift({
          backstory: persona.backstory,
          dayInTheLife: persona.dayInTheLife,
          archetype: persona.archetype,
        });
        if (dbCorpusForScoring.length > 20) dbCorpusForScoring.length = 20;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Persona ${i + 1}: ${message}`);
        console.error(`[generate-personas] turbo failed:`, error);
      }
    }
    timingsMs.turboTotalMs = Date.now() - tTurbo;
  } else if (speedMode === "fast") {
    const tFast = Date.now();
    const baseSummaries = previousSummariesFromDbCorpus(recentPersonas);
    const slotResults = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        (async () => {
          const slotT0 = Date.now();
          try {
            let persona: PersonaOutput | null = null;
            let lastDraft: PersonaOutput | null = null;
            const MAX_ATTEMPTS = 3;
            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
              const nudgeFromPreviousAttempt =
                attempt > 0 && lastDraft
                  ? buildDifferentiationNudge(lastDraft, baseSummaries)
                  : null;
              const prompt = buildPromptFast({
                index: i,
                count,
                domainContext,
                ragContext,
                templateConfig,
                previousPersonas: baseSummaries,
                diversityPlan: diversityPlan[i],
                additionalDifferentiation:
                  attempt > 0
                    ? `Regenerate with different life events and occupation category.${nudgeFromPreviousAttempt ? ` ${nudgeFromPreviousAttempt}` : ""}`
                    : undefined,
                includeSkeptics,
              });
              const draft = await generatePersonaObject({
                model: personaModelFast,
                prompt,
                label: `fast slot ${i + 1} attempt ${attempt + 1}`,
              });
              lastDraft = draft;
              const tooGeneric = containsForbiddenTropes(`${draft.backstory} ${draft.dayInTheLife}`);
              const tooSimilar = isTooSimilarToBatch(draft, baseSummaries);
              const nudge = buildDifferentiationNudge(draft, baseSummaries);
              if (!tooGeneric && !tooSimilar && !nudge) {
                persona = draft;
                break;
              }
              if (attempt === MAX_ATTEMPTS - 1) {
                persona = draft;
              }
            }
            if (!persona) {
              throw new Error("Unable to generate persona");
            }
            timingsMs[`llm_slot_${i}`] = Date.now() - slotT0;
            onPartial?.({ index: i, name: persona.name, archetype: persona.archetype, age: persona.age });
            return { ok: true as const, index: i, persona };
          } catch (e) {
            return {
              ok: false as const,
              index: i,
              error: e instanceof Error ? e.message : "Unknown error",
            };
          }
        })()
      )
    );
    timingsMs.fastParallelLlmMs = Date.now() - tFast;

    const ordered = slotResults
      .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
      .sort((a, b) => a.index - b.index);
    for (const r of slotResults) {
      if (!r.ok) errors.push(`Persona ${r.index + 1}: ${r.error}`);
    }

    const tSave = Date.now();
    const dbCorpusForScoring = recentPersonas.map((row) => ({
      backstory: row.backstory,
      dayInTheLife: row.dayInTheLife,
      archetype: row.archetype,
    }));

    // Run all evals in parallel, then persist all in parallel.
    const evalResults = await Promise.allSettled(
      ordered.map(({ persona }) =>
        scorePersonaAuthenticityHeuristic(persona, dbCorpusForScoring).then((eval_) => ({
          persona,
          eval_,
          qualityScore: computeQualityScore(persona),
          systemPrompt: buildSystemPrompt(persona),
        }))
      )
    );

    await Promise.allSettled(
      evalResults.map(async (result) => {
        if (result.status === "rejected") {
          errors.push(`Eval error: ${result.reason instanceof Error ? result.reason.message : "unknown"}`);
          return;
        }
        const { persona, eval_, qualityScore, systemPrompt } = result.value;
        try {
          await persistPersona(persona, eval_, qualityScore, systemPrompt);
          previousPersonas.push(summaryFromPersona(persona));
          dbCorpusForScoring.unshift({
            backstory: persona.backstory,
            dayInTheLife: persona.dayInTheLife,
            archetype: persona.archetype,
          });
          if (dbCorpusForScoring.length > 20) dbCorpusForScoring.length = 20;
          recentPersonas.unshift({
            name: persona.name,
            backstory: persona.backstory,
            dayInTheLife: persona.dayInTheLife,
            archetype: persona.archetype,
            occupation: persona.occupation,
          });
          if (recentPersonas.length > 20) recentPersonas.length = 20;
        } catch (e) {
          errors.push(`Save error: ${e instanceof Error ? e.message : "unknown"}`);
        }
      })
    );
    timingsMs.fastPersistMs = Date.now() - tSave;
  } else {
    // Quality mode — generate 2 personas at a time using a diversity snapshot so
    // both in a pair diverge from *previous* batch results.
    const personaModel = personaModelQuality;
    const PARALLEL_SIZE = 2;

    const generateWithRetry = async (
      i: number,
      diversitySnapshot: PreviousPersonaSummary[]
    ): Promise<PersonaOutput> => {
      let lastDraft: PersonaOutput | null = null;
      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const nudge =
          attempt > 0 && lastDraft
            ? buildDifferentiationNudge(lastDraft, diversitySnapshot)
            : null;
        const prompt = buildPrompt({
          index: i,
          count,
          domainContext,
          ragContext,
          templateConfig,
          previousPersonas: diversitySnapshot,
          diversityPlan: diversityPlan[i]!,
          additionalDifferentiation:
            attempt > 0
              ? `Previous draft was too generic or too similar. Regenerate with a clearly different upbringing context, life events, and wording.${nudge ? `\nSpecific differentiation required: ${nudge}` : ""}`
              : undefined,
          includeSkeptics,
        });
        const { object: draft } = await generateObject({
          model: personaModel,
          schema: personaSchema,
          prompt,
          maxOutputTokens: 2000,
        });
        lastDraft = draft;
        if (
          !containsForbiddenTropes(`${draft.backstory} ${draft.dayInTheLife}`) &&
          !isTooSimilarToBatch(draft, diversitySnapshot) &&
          !buildDifferentiationNudge(draft, diversitySnapshot)
        ) {
          return draft;
        }
        if (attempt === MAX_ATTEMPTS - 1) return draft;
      }
      throw new Error("Unable to generate non-repetitive persona after retries");
    };

    for (let i = 0; i < count; i += PARALLEL_SIZE) {
      const batchSize = Math.min(PARALLEL_SIZE, count - i);
      // Snapshot diversity BEFORE generating so both personas in the pair see
      // the same prior context (avoids a race where persona A's result poisons
      // persona B's diversity check mid-flight).
      const diversitySnapshot = previousPersonas.slice();

      const settled = await Promise.allSettled(
        Array.from({ length: batchSize }, (_, j) => generateWithRetry(i + j, diversitySnapshot))
      );

      // Flush the PREVIOUS batch's pending saves — evals started during generation above
      // and are almost certainly done (eval ~2-3s, generation ~8-10s per batch).
      await flushPending();

      for (const result of settled) {
        if (result.status === "rejected") {
          const message =
            result.reason instanceof Error ? result.reason.message : "Unknown error";
          errors.push(`Persona ${i + 1}: ${message}`);
          console.error("[generate-personas] Failed:", result.reason);
          continue;
        }
        const persona = result.value;

        onPartial?.({ index: i, name: persona.name, archetype: persona.archetype, age: persona.age });

        // Start eval immediately — runs while the next batch generates
        const corpusSnapshot = recentPersonas.slice();
        const scorePromise = scorePersonaAuthenticity(persona, corpusSnapshot);

        // Update diversity for subsequent batches
        previousPersonas.push(summaryFromPersona(persona));
        recentPersonas.unshift({
          name: persona.name,
          backstory: persona.backstory,
          dayInTheLife: persona.dayInTheLife,
          archetype: persona.archetype,
          occupation: persona.occupation,
        });
        if (recentPersonas.length > 20) recentPersonas.length = 20;

        pendingItems.push({
          persona,
          scorePromise,
          qualityScore: computeQualityScore(persona),
          llmSystemPrompt: buildSystemPrompt(persona),
        });
      }
    }
  }

  // Flush the final batch (no more generation to pipeline against)
  await flushPending();

  // Batch all inngest evaluation events into a single request.
  if (inngestPersonaIds.length > 0) {
    await inngest.send(
      inngestPersonaIds.map((id) => ({
        name: "persona/evaluate.requested" as const,
        data: { personaId: id },
      }))
    );
    evaluationsQueued = inngestPersonaIds.length;
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
    // Make source linking deterministic. In request-driven flows, fire-and-forget can be
    // cut off when the response finishes, leaving personas without source evidence links.
    try {
      await assignAppStoreReviewsToPersonas(groupId);
    } catch (e) {
      console.error("[generate-personas] assignAppStoreReviewsToPersonas failed:", e);
    }
  }

  console.info("[generate-personas] completed", {
    groupId,
    requested: count,
    generated,
    failures: errors.length,
    durationMs: Date.now() - startedAt,
    knowledgeCount: knowledge.length,
    includeSkeptics,
    speedMode,
    timingsMs,
  });

  return { generated, errors, evaluationsQueued, authenticity };
}
