import { generateObject } from "ai";
import { z } from "zod";
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

type PersonaUniquenessReference = Pick<
  PersonaOutput,
  "name" | "archetype" | "bio" | "backstory" | "representativeQuote" | "communicationSample"
>;

const MAX_GENERATION_ATTEMPTS = 3;
const MAX_REFINEMENT_ATTEMPTS = 2;
const MAX_BACKSTORY_REWRITE_ATTEMPTS = 3;
const GENERIC_LANGUAGE_PATTERNS = [
  /\binnovative\b/i,
  /\bpassionate\b/i,
  /\btech[- ]savvy\b/i,
  /\bresults[- ]driven\b/i,
  /\bproblem[- ]solver\b/i,
  /\bdynamic\b/i,
  /\bforward[- ]thinking\b/i,
  /\bgrowing up in a small town\b/i,
  /\balways been passionate\b/i,
  /\bloves technology\b/i,
  /\bwears many hats\b/i,
  /\bfast-paced environment\b/i,
  /\bwork[- ]life balance\b/i,
  /\bthrive under pressure\b/i,
  /\bdata-driven decisions\b/i,
  /\bgo-getter\b/i,
  /\bself-starter\b/i,
  /\bdisrupt(ive|ion)\b/i,
];

const CLICHE_PHRASES = [
  "growing up in a small town",
  "passionate about technology",
  "loves solving problems",
  "wears many hats",
  "fast-paced environment",
  "thinking outside the box",
  "work-life balance",
  "driven by innovation",
  "always on the go",
  "customer-centric mindset",
];

const BACKSTORY_REQUIRED_LABELS = [
  "Origin:",
  "Education:",
  "Early exposure:",
  "Career path:",
  "Current situation:",
  "Key life factors:",
] as const;

const BACKSTORY_BANNED_PHRASES = [
  "growing up",
  "passionate about",
  "has always been interested in",
  "from a young age",
  "loves to",
];

const BACKSTORY_PRONOUN_REPLACE_REGEX =
  /\b(he|she|they|them|his|her|their|theirs|him|hers|himself|herself|themselves)\b/gi;
const BACKSTORY_PRONOUN_TEST_REGEX =
  /\b(he|she|they|them|his|her|their|theirs|him|hers|himself|herself|themselves)\b/i;

const backstoryRewriteSchema = z.object({
  backstory: z.string().min(50).max(2000),
});

const STYLE_VARIANTS = [
  {
    voice: "concise and direct",
    structure: "front-load constraints and present details in compact sentences",
  },
  {
    voice: "narrative and reflective",
    structure: "anchor details around turning points and trade-offs",
  },
  {
    voice: "pragmatic and analytical",
    structure: "focus on decision logic, risk checks, and measurable constraints",
  },
  {
    voice: "casual and conversational",
    structure: "sound naturally spoken with concrete day-to-day language",
  },
];

function normalizeTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeTokens(a));
  const setB = new Set(normalizeTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getPersonaSimilarityScore(
  candidate: PersonaOutput,
  existing: PersonaUniquenessReference
): number {
  const candidateText = [
    candidate.archetype,
    candidate.bio,
    candidate.backstory,
    candidate.representativeQuote,
    candidate.communicationSample,
  ].join(" ");
  const existingText = [
    existing.archetype,
    existing.bio,
    existing.backstory,
    existing.representativeQuote,
    existing.communicationSample,
  ].join(" ");
  return jaccardSimilarity(candidateText, existingText);
}

function getGenericPatternHits(persona: PersonaOutput): number {
  const content = [
    persona.bio,
    persona.backstory,
    persona.archetype,
    persona.representativeQuote,
  ].join(" ");
  return GENERIC_LANGUAGE_PATTERNS.reduce((hits, pattern) => {
    return hits + (pattern.test(content) ? 1 : 0);
  }, 0);
}

function getPersonaRetryReason(
  candidate: PersonaOutput,
  existing: PersonaUniquenessReference[],
  qualityScore: number
): string | null {
  if (qualityScore < 0.72) {
    return `quality-score-too-low:${qualityScore.toFixed(2)}`;
  }

  const genericHits = getGenericPatternHits(candidate);
  if (genericHits >= 3) {
    return `generic-language:${genericHits}`;
  }

  for (const prev of existing) {
    if (candidate.name.trim().toLowerCase() === prev.name.trim().toLowerCase()) {
      return `duplicate-name:${prev.name}`;
    }
    if (
      candidate.archetype.trim().toLowerCase() === prev.archetype.trim().toLowerCase()
    ) {
      return `duplicate-archetype:${prev.archetype}`;
    }
    const similarity = getPersonaSimilarityScore(candidate, prev);
    if (similarity >= 0.52) {
      return `too-similar:${prev.name}:${similarity.toFixed(2)}`;
    }
  }

  return null;
}

function getClicheHits(persona: PersonaOutput): string[] {
  const content = [
    persona.bio,
    persona.backstory,
    persona.representativeQuote,
    persona.communicationSample,
    ...persona.goals,
    ...persona.frustrations,
    ...persona.behaviors,
  ]
    .join(" ")
    .toLowerCase();
  return CLICHE_PHRASES.filter((phrase) => content.includes(phrase));
}

function hasBehavioralDepthGaps(persona: PersonaOutput): string[] {
  const issues: string[] = [];
  const goalsText = persona.goals.join(" ").toLowerCase();
  const frustrationsText = persona.frustrations.join(" ").toLowerCase();
  const behaviorsText = persona.behaviors.join(" ").toLowerCase();

  if (!/(short[- ]term|this quarter|next \d+ months)/i.test(goalsText)) {
    issues.push("missing-short-term-goal");
  }
  if (!/(long[- ]term|next year|2-3 years|future)/i.test(goalsText)) {
    issues.push("missing-long-term-goal");
  }
  if (!/(hesitat|avoid|delay|resist|concern)/i.test(frustrationsText)) {
    issues.push("missing-objection-signal");
  }
  if (!/(trigger|signal|decide|compare|validate|test)/i.test(behaviorsText)) {
    issues.push("missing-decision-trigger");
  }
  if (!/but|however|although|yet/.test(`${persona.backstory} ${persona.bio}`.toLowerCase())) {
    issues.push("missing-visible-contradiction");
  }
  return issues;
}

function normalizeBackstoryLines(backstory: string): string[] {
  return backstory
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function hasRequiredBackstoryLabels(backstory: string): boolean {
  const lines = normalizeBackstoryLines(backstory);
  return BACKSTORY_REQUIRED_LABELS.every((label) =>
    lines.some((line) => line.startsWith(label))
  );
}

function getBackstoryBannedPhraseHits(backstory: string): string[] {
  const lower = backstory.toLowerCase();
  return BACKSTORY_BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

function sanitizeBackstoryPronouns(backstory: string): string {
  return backstory
    .replace(BACKSTORY_PRONOUN_REPLACE_REGEX, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/:\s+\./g, ": ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getBackstoryLineSignatures(backstory: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = normalizeBackstoryLines(backstory);
  for (const line of lines) {
    const label = BACKSTORY_REQUIRED_LABELS.find((candidate) =>
      line.startsWith(candidate)
    );
    if (!label) continue;
    result[label] = line.slice(label.length).trim().toLowerCase();
  }
  return result;
}

function getBackstorySimilarityIssues(
  candidateBackstory: string,
  previousPersonas: PersonaUniquenessReference[]
): string[] {
  const issues: string[] = [];
  const candidateLines = getBackstoryLineSignatures(candidateBackstory);
  for (const prev of previousPersonas) {
    const prevLines = getBackstoryLineSignatures(prev.backstory);
    const overlapLabels: string[] = [];
    const checkLabels: (keyof typeof candidateLines)[] = [
      "Origin:",
      "Education:",
      "Early exposure:",
    ];
    for (const label of checkLabels) {
      if (
        candidateLines[label] &&
        prevLines[label] &&
        jaccardSimilarity(candidateLines[label], prevLines[label]) >= 0.62
      ) {
        overlapLabels.push(label);
      }
    }
    if (overlapLabels.length > 0) {
      issues.push(`shared-pattern-with:${prev.name}:${overlapLabels.join("|")}`);
    }
    const fullSimilarity = jaccardSimilarity(candidateBackstory, prev.backstory);
    if (fullSimilarity >= 0.5) {
      issues.push(`backstory-too-similar:${prev.name}:${fullSimilarity.toFixed(2)}`);
    }
  }
  return issues;
}

function getBackstoryQualityIssues(
  backstory: string,
  previousPersonas: PersonaUniquenessReference[]
): string[] {
  const issues: string[] = [];
  const lines = normalizeBackstoryLines(backstory);
  if (lines.length < 5 || lines.length > 7) {
    issues.push(`line-count-invalid:${lines.length}`);
  }
  if (!hasRequiredBackstoryLabels(backstory)) {
    issues.push("missing-required-labels");
  }
  if (BACKSTORY_PRONOUN_TEST_REGEX.test(backstory)) {
    issues.push("contains-pronouns");
  }
  const bannedHits = getBackstoryBannedPhraseHits(backstory);
  if (bannedHits.length > 0) {
    issues.push(`contains-banned-phrases:${bannedHits.join("|")}`);
  }
  const similarityIssues = getBackstorySimilarityIssues(backstory, previousPersonas);
  issues.push(...similarityIssues);
  return issues;
}

async function rewriteBackstoryStrict(params: {
  candidate: PersonaOutput;
  previousPersonas: PersonaUniquenessReference[];
  issues: string[];
  domainContext?: string;
}): Promise<string> {
  const { candidate, previousPersonas, issues, domainContext } = params;
  const prevBackstories = previousPersonas
    .slice(-8)
    .map((p) => `${p.name}\n${p.backstory}`)
    .join("\n\n---\n\n");

  const prompt = `Rewrite ONLY the backstory for a persona under strict constraints.

Persona context:
- Name: ${candidate.name}
- Occupation: ${candidate.occupation}
- Location: ${candidate.location}
- Archetype: ${candidate.archetype}
- Domain context: ${domainContext || "N/A"}
- Existing backstory:
${candidate.backstory}

Known issues:
${issues.map((issue) => `- ${issue}`).join("\n")}

Backstories already used in this batch (must be differentiated):
${prevBackstories || "none"}

Hard rules:
1) Do NOT use pronouns: he, she, they, them, his, her, their, etc.
2) Do NOT use phrases: growing up, passionate about, has always been interested in, from a young age, loves to.
3) No narrative storytelling style.
4) Output exactly 6 lines, each introducing new information.
5) Use this exact labeled format:
- Origin: ...
- Education: ...
- Early exposure: ...
- Career path: ...
- Current situation: ...
- Key life factors: ...
6) Use concrete details and grounded constraints. No fluff.
7) No two personas should share origin pattern, education path, or early exposure type.
`;

  const { object } = await generateObject({
    model: getModel(),
    schema: backstoryRewriteSchema,
    prompt,
  });

  return object.backstory.trim();
}

async function refinePersonaCandidate(params: {
  candidate: PersonaOutput;
  index: number;
  count: number;
  domainContext?: string;
  ragContext?: string;
  retryReasons: string[];
  previousPersonas: PersonaUniquenessReference[];
}): Promise<PersonaOutput> {
  const {
    candidate,
    index,
    count,
    domainContext,
    ragContext,
    retryReasons,
    previousPersonas,
  } = params;
  const similarNames = previousPersonas.slice(-6).map((p) => `${p.name} (${p.archetype})`).join(", ");
  const refinePrompt = `You are improving one synthetic persona draft to remove generic language and increase realism.

Context:
- Persona position in batch: ${index + 1}/${count}
- Domain context: ${domainContext || "none provided"}
- Research context available: ${ragContext ? "yes" : "no"}
- Existing personas to differ from: ${similarNames || "none"}

Draft persona JSON:
${JSON.stringify(candidate)}

Detected issues to fix:
${retryReasons.map((r) => `- ${r}`).join("\n")}

Rewrite this persona so it is specific, imperfect, and distinct.
Hard rules:
- Do not use cliches like: ${CLICHE_PHRASES.join(", ")}
- Keep all required schema fields valid.
- Include explicit short-term and long-term goals.
- Include at least one concrete objection and one concrete trigger in frustrations/behaviors.
- Keep quote natural and non-corporate.
- Ensure contradiction is explicit in bio or backstory.
- Keep demographic stereotypes out.
`;

  const { object } = await generateObject({
    model: getModel(),
    schema: personaSchema,
    prompt: refinePrompt,
  });
  return object;
}

function buildRetryPromptAddendum(
  existing: PersonaUniquenessReference[],
  retryReasons: string[]
): string {
  const recent = existing.slice(-8);
  const avoidList = recent
    .map((p) => `- ${p.name} (${p.archetype})`)
    .join("\n");
  const reasonList = retryReasons.length
    ? retryReasons.map((reason) => `- ${reason}`).join("\n")
    : "- persona too generic or too similar";

  return `\n\nSTRICT DIFFERENTIATION FOR THIS ATTEMPT:
- This persona MUST be clearly different from the prior personas listed below.
- Use a distinct worldview, life history, communication style, and emotional tone.
- Avoid generic startup language and broad platitudes.
- Include specific, concrete details tied to lived experiences.

PRIOR PERSONAS TO DIFFER FROM:
${avoidList || "- none"}

RETRY FEEDBACK TO CORRECT:
${reasonList}`;
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
  const style = STYLE_VARIANTS[index % STYLE_VARIANTS.length];

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
- FORBIDDEN CLICHES: ${CLICHE_PHRASES.join(", ")}
- Avoid generic startup phrasing and generic backstory tropes`
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
    "Vary geography and environment signals (urban/suburban/rural/international) when plausible.",
    "Vary career path shape (linear, pivoted, interrupted, unconventional).",
    "Vary socioeconomic constraints subtly and realistically.",
    "Backstory must avoid pronouns and narrative voice.",
    `Write in a ${style.voice} voice and ${style.structure}.`,
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
- The personality traits should be COHERENT with the backstory and behaviors — a cautious person should have low riskTolerance, a blunt person should have high directness
- goals must include one short-term and one long-term item
- frustrations must include at least one concrete hesitation/objection
- behaviors must include at least one explicit decision trigger
- Do not repeat sentence openings across bio/backstory/quote
- backstory must use exactly this 6-line structure and labels:
  Origin: [city/region + environment type]
  Education: [specific path, degree/no-degree, transitions]
  Early exposure: [specific event, job, or situation]
  Career path: [non-linear steps if applicable]
  Current situation: [role, environment, constraints]
  Key life factors: [2-3 concrete influences shaping behavior]
- backstory MUST contain zero pronouns`
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

  const previousPersonas: PersonaUniquenessReference[] = [];
  const errors: string[] = [];
  let generated = 0;

  // Generate sequentially to keep differentiation context up-to-date between personas.
  for (let i = 0; i < count; i++) {
    try {
      const retryReasons: string[] = [];
      let selectedPersona: PersonaOutput | null = null;

      for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
        let prompt = buildPrompt({
          index: i,
          count,
          domainContext,
          ragContext,
          templateConfig,
          previousPersonas,
        });

        if (attempt > 1) {
          prompt += buildRetryPromptAddendum(previousPersonas, retryReasons);
        }

        const { object: candidate } = await generateObject({
          model: getModel(),
          schema: personaSchema,
          prompt,
        });

        const qualityScore = computeQualityScore(candidate);
        const clicheHits = getClicheHits(candidate);
        const depthIssues = hasBehavioralDepthGaps(candidate);
        const retryReason = getPersonaRetryReason(
          candidate,
          previousPersonas,
          qualityScore
        );
        if (clicheHits.length > 0) {
          retryReasons.push(`cliche-phrases:${clicheHits.join("|")}`);
        }
        if (depthIssues.length > 0) {
          retryReasons.push(`behavioral-depth:${depthIssues.join("|")}`);
        }

        if (!retryReason && clicheHits.length === 0 && depthIssues.length === 0) {
          selectedPersona = candidate;
          break;
        }

        if (attempt === MAX_GENERATION_ATTEMPTS) {
          let refined = candidate;
          for (let refineAttempt = 1; refineAttempt <= MAX_REFINEMENT_ATTEMPTS; refineAttempt++) {
            refined = await refinePersonaCandidate({
              candidate: refined,
              index: i,
              count,
              domainContext,
              ragContext,
              retryReasons: retryReasons.length > 0 ? retryReasons : [retryReason ?? "generic-output"],
              previousPersonas,
            });
            const refinedQuality = computeQualityScore(refined);
            const refinedRetry = getPersonaRetryReason(refined, previousPersonas, refinedQuality);
            const refinedCliches = getClicheHits(refined);
            const refinedDepth = hasBehavioralDepthGaps(refined);
            if (!refinedRetry && refinedCliches.length === 0 && refinedDepth.length === 0) {
              break;
            }
          }
          selectedPersona = refined;
          break;
        }

        if (retryReason) retryReasons.push(retryReason);
      }

      if (!selectedPersona) {
        throw new Error("No persona candidate generated after retries");
      }

      let normalizedBackstory = sanitizeBackstoryPronouns(selectedPersona.backstory);
      let backstoryIssues = getBackstoryQualityIssues(
        normalizedBackstory,
        previousPersonas
      );
      if (backstoryIssues.length > 0) {
        for (
          let rewriteAttempt = 1;
          rewriteAttempt <= MAX_BACKSTORY_REWRITE_ATTEMPTS;
          rewriteAttempt++
        ) {
          normalizedBackstory = await rewriteBackstoryStrict({
            candidate: {
              ...selectedPersona,
              backstory: normalizedBackstory,
            },
            previousPersonas,
            issues: backstoryIssues,
            domainContext,
          });
          normalizedBackstory = sanitizeBackstoryPronouns(normalizedBackstory);
          backstoryIssues = getBackstoryQualityIssues(
            normalizedBackstory,
            previousPersonas
          );
          if (backstoryIssues.length === 0) break;
        }
      }

      selectedPersona = {
        ...selectedPersona,
        backstory: normalizedBackstory,
      };

      const qualityScore = computeQualityScore(selectedPersona);
      const llmSystemPrompt = buildSystemPrompt(selectedPersona);

      const createdPersona = await prisma.persona.create({
        data: {
          personaGroupId: groupId,
          name: selectedPersona.name,
          age: selectedPersona.age,
          gender: selectedPersona.gender,
          location: selectedPersona.location,
          occupation: selectedPersona.occupation,
          bio: selectedPersona.bio,
          backstory: selectedPersona.backstory,
          goals: selectedPersona.goals,
          frustrations: selectedPersona.frustrations,
          behaviors: selectedPersona.behaviors,
          sourceType,
          qualityScore,
          llmSystemPrompt,
          archetype: selectedPersona.archetype,
          representativeQuote: selectedPersona.representativeQuote,
          techLiteracy: selectedPersona.techLiteracy,
          domainExpertise: selectedPersona.domainExpertise,
          dayInTheLife: selectedPersona.dayInTheLife,
          coreValues: selectedPersona.coreValues,
          communicationSample: selectedPersona.communicationSample,
          personality: {
            create: {
              openness: selectedPersona.personality.openness,
              conscientiousness: selectedPersona.personality.conscientiousness,
              extraversion: selectedPersona.personality.extraversion,
              agreeableness: selectedPersona.personality.agreeableness,
              neuroticism: selectedPersona.personality.neuroticism,
              communicationStyle: selectedPersona.personality.communicationStyle,
              responseLengthTendency: selectedPersona.personality.responseLengthTendency,
              decisionMakingStyle: selectedPersona.personality.decisionMakingStyle,
              riskTolerance: selectedPersona.personality.riskTolerance,
              trustPropensity: selectedPersona.personality.trustPropensity,
              emotionalExpressiveness: selectedPersona.personality.emotionalExpressiveness,
              directness: selectedPersona.personality.directness,
              criticalFeedbackTendency: selectedPersona.personality.criticalFeedbackTendency,
              vocabularyLevel: selectedPersona.personality.vocabularyLevel,
              tangentTendency: selectedPersona.personality.tangentTendency,
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

      previousPersonas.push({
        name: selectedPersona.name,
        archetype: selectedPersona.archetype,
        bio: selectedPersona.bio,
        backstory: selectedPersona.backstory,
        representativeQuote: selectedPersona.representativeQuote,
        communicationSample: selectedPersona.communicationSample,
      });

      generated++;
      onProgress?.(generated, count, selectedPersona.name);
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

  return { generated, errors };
}
