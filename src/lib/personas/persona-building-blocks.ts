import type { PersonaOutput } from "@/lib/validation/schemas";
import type { PersonaTemplateConfig } from "@/lib/personas/templates";

/** Deterministic pick from arrays for reproducible diversity per slot. */
export function slotSeed(parts: string[], index: number): number {
  const s = `${parts.join("\0")}\0#${index}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length]!;
}

const FIRST_NAMES = [
  "Jordan",
  "Sam",
  "Riley",
  "Morgan",
  "Casey",
  "Avery",
  "Quinn",
  "Jamie",
  "Taylor",
  "Cameron",
  "Alex",
  "Drew",
  "Skyler",
  "Reese",
  "Rowan",
  "Emerson",
  "Hayden",
  "Parker",
  "Sydney",
  "Logan",
  "Harper",
  "Blake",
  "Kendall",
  "Marley",
  "Phoenix",
  "River",
  "Shannon",
  "Devon",
  "Jules",
  "Micah",
] as const;

const LAST_NAMES = [
  "Okonkwo",
  "Patel",
  "Nakamura",
  "Silva",
  "Kowalski",
  "Haddad",
  "Fernández",
  "Nguyen",
  "Okafor",
  "Andersen",
  "Khan",
  "Bergström",
  "Cohen",
  "Santos",
  "Yamamoto",
  "Osei",
  "Novak",
  "Rahman",
  "Larsen",
  "Costa",
  "Murphy",
  "Dubois",
  "Hernández",
  "Park",
  "Schmidt",
  "Ibrahim",
  "Johansson",
  "Reyes",
  "García",
  "O'Brien",
] as const;

const LOCATIONS = [
  "Berlin, Germany",
  "Lagos, Nigeria",
  "Toronto, Canada",
  "São Paulo, Brazil",
  "Melbourne, Australia",
  "Seoul, South Korea",
  "Mexico City, Mexico",
  "Chicago, IL, USA",
  "Mumbai, India",
  "Warsaw, Poland",
  "Singapore",
  "Madrid, Spain",
  "Nairobi, Kenya",
  "Dublin, Ireland",
  "Auckland, New Zealand",
  "Tel Aviv, Israel",
  "Lyon, France",
  "Helsinki, Finland",
  "Atlanta, GA, USA",
  "Portland, OR, USA",
] as const;

const OCCUPATIONS = [
  "operations manager at a mid-size logistics firm",
  "UX researcher at a healthcare startup",
  "high school science teacher",
  "freelance product photographer",
  "civil engineer in municipal infrastructure",
  "customer support lead at a SaaS company",
  "registered nurse in an urban clinic",
  "small business accountant",
  "field sales representative",
  "data analyst at a retailer",
  "journalist covering local policy",
  "software engineer on a platform team",
  "restaurant owner-operator",
  "warehouse supervisor",
  "marketing coordinator at a nonprofit",
  "IT administrator at a school district",
  "electrician with a growing crew",
  "real estate agent",
  "pharmacist",
  "university admissions counselor",
] as const;

const ARCHETYPES = [
  "The Pragmatic Skeptic",
  "The Cautious Optimist",
  "The Systems Thinker",
  "The Time-Pressed Realist",
  "The Quiet Analyst",
  "The Hands-On Fixer",
  "The Budget-Conscious Planner",
  "The Empathetic Traditionalist",
  "The Direct Problem-Solver",
  "The Risk-Aware Operator",
  "The Community-Minded Professional",
  "The Self-Taught Specialist",
] as const;

const CORE_VALUES_POOL = [
  "family stability",
  "financial independence",
  "professional credibility",
  "autonomy at work",
  "fairness in contracts",
  "health and sleep",
  "local community ties",
  "continuous learning",
  "honest feedback",
  "predictable routines",
  "privacy",
  "craft quality",
] as const;

const GOAL_FRAGMENTS = [
  "reduce recurring admin overhead",
  "ship reliable work without burning out",
  "grow income without doubling hours",
  "make tooling decisions the team will actually adopt",
  "keep stakeholders aligned with minimal meetings",
  "protect margin while improving customer experience",
  "build a reputation for calm execution",
  "shorten feedback loops with customers",
] as const;

const FRUSTRATION_FRAGMENTS = [
  "vendors that over-promise integration timelines",
  "dashboards that hide the one number leadership asks for",
  "password resets and access tickets",
  "pricing that shifts after onboarding",
  "tools that require constant babysitting",
  "unclear ownership when something breaks",
  "meetings that could have been a checklist",
  "onboarding flows that assume expert users",
] as const;

const BEHAVIOR_FRAGMENTS = [
  "keeps a personal checklist before adopting new software",
  "asks for a trial period and measures time-to-value",
  "reads reviews and asks peers in group chats",
  "defaults to spreadsheets when unsure",
  "escalates only after trying self-serve fixes",
  "prefers short written summaries over live demos",
  "negotiates renewals early to avoid surprise bills",
  "documents decisions for the team wiki",
] as const;

const CONTRADICTION_FRAGMENTS = [
  "Tells friends they are unplugging on weekends but still checks work chat on Sunday nights out of habit",
  "Presents as low-drama at work yet keeps a mental ledger of small slights for months",
  "Claims to hate meetings but gets restless when left off an invite list",
  "Says money is not everything while pricing every decision against lost hourly rate",
  "Describes themselves as patient but sends follow-up pings the moment a deadline looms",
] as const;

const HABIT_FRAGMENTS = [
  "Rewrites the same email three times before sending, then sends the second draft anyway",
  "Always arrives seven minutes early and pretends to read notifications until the room fills",
  "Labels pantry containers at home but lets desktop downloads pile into chaos",
  "Ends the day by writing tomorrow's top three on a sticky note that migrates for a week",
] as const;

const OPINION_FRAGMENTS = [
  "Thinks most 'AI features' are demos that die the first week of real use",
  "Believes loyalty programs are a tax on people bad at math",
  "Insists that if onboarding needs a PDF, the product already failed",
  "Feels public roadmaps are mostly theater unless dates hurt someone",
] as const;

const QUIRK_FRAGMENTS = [
  "Uses the same mug until it chips, then acts personally betrayed",
  "Mute-by-default on video calls but types long asides in chat",
  "Apologizes to inanimate objects when bumping them",
  "Refuses to delete old tabs; calls it 'ambient context'",
] as const;

const BIAS_FRAGMENTS = [
  "Over-trusts handwritten notes and distrusts anything that only exists in the cloud",
  "Will pay more for a vendor that answers the phone on the second ring",
  "Holds an irrational grudge against brands that changed a logo they liked",
  "Defaults to the tool their cousin recommended once, even when specs disagree",
] as const;

type TraitPreset = Pick<
  PersonaOutput["personality"],
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "neuroticism"
  | "communicationStyle"
  | "responseLengthTendency"
  | "decisionMakingStyle"
  | "riskTolerance"
  | "trustPropensity"
  | "emotionalExpressiveness"
  | "directness"
  | "criticalFeedbackTendency"
  | "vocabularyLevel"
  | "tangentTendency"
>;

const PERSONALITY_PRESETS: readonly TraitPreset[] = [
  {
    openness: 0.72,
    conscientiousness: 0.68,
    extraversion: 0.42,
    agreeableness: 0.48,
    neuroticism: 0.38,
    communicationStyle: "analytical",
    responseLengthTendency: "medium",
    decisionMakingStyle: "analytical",
    riskTolerance: 0.45,
    trustPropensity: 0.4,
    emotionalExpressiveness: 0.35,
    directness: 0.62,
    criticalFeedbackTendency: 0.58,
    vocabularyLevel: "professional",
    tangentTendency: 0.32,
  },
  {
    openness: 0.55,
    conscientiousness: 0.74,
    extraversion: 0.58,
    agreeableness: 0.52,
    neuroticism: 0.44,
    communicationStyle: "direct",
    responseLengthTendency: "short",
    decisionMakingStyle: "intuitive",
    riskTolerance: 0.5,
    trustPropensity: 0.55,
    emotionalExpressiveness: 0.4,
    directness: 0.7,
    criticalFeedbackTendency: 0.45,
    vocabularyLevel: "casual",
    tangentTendency: 0.28,
  },
  {
    openness: 0.48,
    conscientiousness: 0.6,
    extraversion: 0.35,
    agreeableness: 0.62,
    neuroticism: 0.55,
    communicationStyle: "empathetic",
    responseLengthTendency: "long",
    decisionMakingStyle: "dependent",
    riskTolerance: 0.38,
    trustPropensity: 0.48,
    emotionalExpressiveness: 0.6,
    directness: 0.42,
    criticalFeedbackTendency: 0.35,
    vocabularyLevel: "professional",
    tangentTendency: 0.5,
  },
  {
    openness: 0.63,
    conscientiousness: 0.52,
    extraversion: 0.7,
    agreeableness: 0.58,
    neuroticism: 0.33,
    communicationStyle: "verbose",
    responseLengthTendency: "medium",
    decisionMakingStyle: "spontaneous",
    riskTolerance: 0.62,
    trustPropensity: 0.58,
    emotionalExpressiveness: 0.55,
    directness: 0.55,
    criticalFeedbackTendency: 0.4,
    vocabularyLevel: "casual",
    tangentTendency: 0.58,
  },
  {
    openness: 0.4,
    conscientiousness: 0.78,
    extraversion: 0.45,
    agreeableness: 0.44,
    neuroticism: 0.48,
    communicationStyle: "analytical",
    responseLengthTendency: "short",
    decisionMakingStyle: "avoidant",
    riskTolerance: 0.33,
    trustPropensity: 0.32,
    emotionalExpressiveness: 0.3,
    directness: 0.58,
    criticalFeedbackTendency: 0.65,
    vocabularyLevel: "technical",
    tangentTendency: 0.22,
  },
  {
    openness: 0.68,
    conscientiousness: 0.45,
    extraversion: 0.52,
    agreeableness: 0.5,
    neuroticism: 0.42,
    communicationStyle: "analytical",
    responseLengthTendency: "medium",
    decisionMakingStyle: "analytical",
    riskTolerance: 0.55,
    trustPropensity: 0.5,
    emotionalExpressiveness: 0.45,
    directness: 0.52,
    criticalFeedbackTendency: 0.5,
    vocabularyLevel: "academic",
    tangentTendency: 0.4,
  },
] as const;

export interface AssembleTurboPersonaParams {
  groupId: string;
  index: number;
  count: number;
  domainContext?: string;
  templateConfig?: PersonaTemplateConfig;
  upbringing: string;
  socioeconomic: string;
  lifePath: string;
}

/**
 * Assembles a schema-valid PersonaOutput from curated pools (no LLM).
 * Intended for Turbo mode: sub-second generation, "good enough" realism.
 */
export function assembleTurboPersona(params: AssembleTurboPersonaParams): PersonaOutput {
  const {
    groupId,
    index,
    count,
    domainContext,
    templateConfig,
    upbringing,
    socioeconomic,
    lifePath,
  } = params;

  const seed = slotSeed(
    [groupId, domainContext ?? "", templateConfig?.id ?? "", String(count)],
    index
  );

  const firstName = pick(FIRST_NAMES, seed, 1);
  const lastName = pick(LAST_NAMES, seed, 3);
  const name = `${firstName} ${lastName}`;

  const location = templateConfig?.demographics.typicalLocations?.length
    ? pick(templateConfig.demographics.typicalLocations, seed, 5)
    : pick(LOCATIONS, seed, 5);

  const occupation = templateConfig?.demographics.typicalProfessions?.length
    ? pick(templateConfig.demographics.typicalProfessions, seed, 7)
    : pick(OCCUPATIONS, seed, 7);

  const archetype = pick(ARCHETYPES, seed, 11);
  const age = templateConfig
    ? Math.round(
        (templateConfig.demographics.ageRange.min + templateConfig.demographics.ageRange.max) / 2 +
          (seed % 7) -
          3
      )
    : 22 + (seed % 45);
  const ageClamped = Math.min(72, Math.max(22, age));

  const gender = seed % 2 === 0 ? "Female" : "Male";

  const preset = pick(PERSONALITY_PRESETS, seed, 13);

  const v1 = pick(CORE_VALUES_POOL, seed, 17);
  const v2 = pick(CORE_VALUES_POOL, seed, 19);
  const v3 = pick(CORE_VALUES_POOL, seed, 23);
  const coreValues = Array.from(new Set([v1, v2, v3]));

  const goals = [
    pick(GOAL_FRAGMENTS, seed, 29),
    pick(GOAL_FRAGMENTS, seed, 31),
  ];
  const frustrations = [
    pick(FRUSTRATION_FRAGMENTS, seed, 37),
    pick(FRUSTRATION_FRAGMENTS, seed, 41),
  ];
  const behaviors = [
    pick(BEHAVIOR_FRAGMENTS, seed, 43),
    pick(BEHAVIOR_FRAGMENTS, seed, 47),
    pick(BEHAVIOR_FRAGMENTS, seed, 48),
  ];

  const c1 = pick(CONTRADICTION_FRAGMENTS, seed, 49);
  const c2 = pick(CONTRADICTION_FRAGMENTS, seed, 51);
  const uniqueContradictions = c1 === c2 ? [c1] : [c1, c2];

  const habits = [
    pick(HABIT_FRAGMENTS, seed, 55),
    pick(HABIT_FRAGMENTS, seed, 57),
  ];
  const opinions = [
    pick(OPINION_FRAGMENTS, seed, 59),
    pick(OPINION_FRAGMENTS, seed, 61),
  ];
  const quirks = [
    pick(QUIRK_FRAGMENTS, seed, 63),
    pick(QUIRK_FRAGMENTS, seed, 65),
    pick(QUIRK_FRAGMENTS, seed, 67),
  ];

  const formativeExperiences: [string, string] = [
    `In ${location}, at twenty-six, they took the blame for a botched handoff to protect a junior—then spent a year proving they would not do it twice.`,
    `A ${lifePath} stretch meant sleeping on a cousin's couch for six weeks; they still overpack snacks whenever travel is mentioned.`,
  ];

  const recurringHabit = pick(HABIT_FRAGMENTS, seed, 69);

  const communicationFingerprint =
    "Sentences run medium-long with occasional short stubs for emphasis; uses commas heavily; almost never uses emoji; hedges with 'I mean' when uncertain; reads aloud tricky messages once before sending.";

  const cognitiveBiasOrIrrationalStreak = pick(BIAS_FRAGMENTS, seed, 71);

  const domainLine = domainContext    ? ` Their decisions are shaped by this product context: ${domainContext.slice(0, 280)}${domainContext.length > 280 ? "…" : ""}`
    : "";

  const backstory = `${firstName} ${lastName} grew up in a ${upbringing} setting with ${socioeconomic} pressures. Early work meant taking responsibility quickly: a first role in customer-facing operations taught them how promises translate into late nights. A ${lifePath} moment forced a reset in priorities and tightened their standards for what counts as “done.”${domainLine} They still negotiate trade-offs between credibility and speed, and they distrust one-size-fits-all narratives about users like them. Those inner tensions show up in small weekly habits more than in what they say in meetings.`;

  const dayInTheLife = `Morning starts with triage: messages, a short commute or home desk setup, then the real work of coordinating people who do not share the same urgency. Midday is meetings or site checks, depending on the week, and the afternoon is where plans either survive contact with reality or get rewritten.

Evening is quieter: they replay one decision from the day and note what they would change. Weekends are guarded for recovery, though work sometimes leaks in through alerts they pretend not to see.`;

  const bio = `${name} is a ${ageClamped}-year-old ${occupation} based in ${location}. ${archetype.split(" ").slice(1).join(" ")} — practical, specific, and allergic to buzzwords.`;

  const representativeQuote = `I don't need the perfect tool—I need one my team will actually use without a week of training.`;

  const communicationSample = `If it saves real time, I'll adopt it. If it's another dashboard for someone else's question—not mine—I'll keep the spreadsheet, honestly.`;

  return {
    name,
    age: ageClamped,
    gender,
    location,
    occupation,
    bio,
    backstory,
    goals,
    frustrations,
    behaviors,
    archetype,
    representativeQuote,
    techLiteracy: 2 + (seed % 4),
    domainExpertise: pick(["novice", "intermediate", "expert"] as const, seed, 53),
    dayInTheLife,
    coreValues,
    communicationSample,
    formativeExperiences,
    recurringHabit,
    contradictions: uniqueContradictions,
    habits,
    opinions,
    quirks,
    communicationFingerprint,
    cognitiveBiasOrIrrationalStreak,
    authenticitySelfScore: 62 + (seed % 12),
    relatabilityScore: 64 + (seed % 14),
    personality: { ...preset },
  };
}
