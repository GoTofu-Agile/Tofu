export type AgeRange = {
  min: number;
  max: number;
};

export type GenderBalance =
  | "mostly_female"
  | "mostly_male"
  | "mixed"
  | "unspecified";

export type DiversityFocus = "broad" | "focused";

export interface PersonaTemplateDemographics {
  ageRange: AgeRange;
  genderBalance: GenderBalance;
  typicalLocations?: string[];
  typicalProfessions?: string[];
}

export interface PersonaTemplateBehaviorProfile {
  summary: string;
  communicationStyle?: string;
  decisionStyle?: string;
  riskToleranceHint?: "low" | "medium" | "high";
  skepticismHint?: "low" | "medium" | "high";
}

export interface PersonaTemplateConfig {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  exampleUseCases: string[];
  demographics: PersonaTemplateDemographics;
  behaviorProfile: PersonaTemplateBehaviorProfile;
  defaultPersonaCount: number;
  diversityFocus: DiversityFocus;
}

export const PERSONA_TEMPLATES: PersonaTemplateConfig[] = [
  {
    id: "young-caring-professionals",
    name: "Young Caring Professionals",
    shortLabel: "Women 18–36 in social roles",
    description:
      "Women in their 20s and early 30s working in caring professions like healthcare, education, and social work, juggling high emotional workloads with limited time and tools.",
    exampleUseCases: [
      "Testing a scheduling or documentation tool for nurses, teachers, or social workers",
      "Exploring burnout, workload, and self-care needs in caring professions",
    ],
    demographics: {
      ageRange: { min: 22, max: 36 },
      genderBalance: "mostly_female",
      typicalLocations: ["mid-sized cities", "suburban areas"],
      typicalProfessions: [
        "nurse",
        "midwife",
        "teacher",
        "social worker",
        "care worker",
      ],
    },
    behaviorProfile: {
      summary:
        "Empathetic, resilient, and practical; constantly balancing empathy for others with their own energy and time limits.",
      communicationStyle:
        "Warm and straightforward, using concrete examples from daily work rather than abstract theory.",
      decisionStyle:
        "Pragmatic and time-boxed — they choose tools that reduce friction in an already overloaded day.",
      riskToleranceHint: "medium",
      skepticismHint: "medium",
    },
    defaultPersonaCount: 8,
    diversityFocus: "broad",
  },
  {
    id: "productive-devs",
    name: "Productive Developers",
    shortLabel: "Men 30–60, dev & tooling",
    description:
      "Mid-career engineers and technical ICs who care deeply about performance, automation, and code quality, but have limited patience for hype.",
    exampleUseCases: [
      "Evaluating a new developer tool or platform",
      "Understanding how engineers adopt or reject new workflows",
    ],
    demographics: {
      ageRange: { min: 30, max: 55 },
      genderBalance: "mostly_male",
      typicalLocations: ["tech hubs", "remote across Europe", "North America"],
      typicalProfessions: [
        "software engineer",
        "backend developer",
        "frontend developer",
        "devops engineer",
      ],
    },
    behaviorProfile: {
      summary:
        "Analytical, opinionated, and efficiency-driven; they respect tools that get out of the way and distrust vague promises.",
      communicationStyle:
        "Direct, precise, and sometimes blunt; they reference specific tools, stacks, and benchmarks.",
      decisionStyle:
        "Evidence-based — they look for real-world benchmarks, documentation quality, and integration stories.",
      riskToleranceHint: "medium",
      skepticismHint: "high",
    },
    defaultPersonaCount: 10,
    diversityFocus: "broad",
  },
  {
    id: "busy-team-leads",
    name: "Busy Team Leads",
    shortLabel: "Team leads & PMs",
    description:
      "Team leads and project managers who sit between leadership and ICs, constantly reprioritising, managing stakeholders, and keeping projects on track.",
    exampleUseCases: [
      "Testing collaboration or planning tools for cross-functional teams",
      "Exploring pain points around reporting, coordination, and meetings",
    ],
    demographics: {
      ageRange: { min: 28, max: 45 },
      genderBalance: "mixed",
      typicalLocations: ["enterprise offices", "remote-friendly companies"],
      typicalProfessions: [
        "engineering manager",
        "product manager",
        "project manager",
        "team lead",
      ],
    },
    behaviorProfile: {
      summary:
        "Organised but time-poor, constantly context-switching and filtering noise for their team.",
      communicationStyle:
        "Structured and goal-oriented; they talk in terms of timelines, risks, and trade-offs.",
      decisionStyle:
        "Balancing stakeholder expectations with team capacity; they prefer tools that reduce coordination overhead.",
      riskToleranceHint: "medium",
      skepticismHint: "medium",
    },
    defaultPersonaCount: 8,
    diversityFocus: "broad",
  },
  {
    id: "founders-and-solo-builders",
    name: "Founders & Solo Builders",
    shortLabel: "Early-stage founders",
    description:
      "Hands-on founders and solo builders who wear many hats, move quickly, and are willing to experiment if the upside is clear.",
    exampleUseCases: [
      "Validating early-stage B2B SaaS ideas",
      "Understanding willingness to pay and adoption hurdles for new tools",
    ],
    demographics: {
      ageRange: { min: 24, max: 50 },
      genderBalance: "mixed",
      typicalLocations: ["startup hubs", "remote-first communities"],
      typicalProfessions: [
        "startup founder",
        "indie hacker",
        "solo consultant",
        "product-minded engineer",
      ],
    },
    behaviorProfile: {
      summary:
        "Resourceful, optimistic, and opportunity-driven; they quickly connect product ideas to revenue and survival.",
      communicationStyle:
        "Energetic and story-driven, sharing experiments, small wins, and failures.",
      decisionStyle:
        "Fast, gut-driven decisions constrained by runway and time; they adopt tools that unlock leverage immediately.",
      riskToleranceHint: "high",
      skepticismHint: "medium",
    },
    defaultPersonaCount: 6,
    diversityFocus: "focused",
  },
  {
    id: "corporate-stakeholders",
    name: "Corporate Stakeholders",
    shortLabel: "Senior managers & execs",
    description:
      "Directors and senior managers in larger organisations who own budgets and outcomes but rely on teams to execute.",
    exampleUseCases: [
      "Testing executive dashboards or reporting tools",
      "Understanding how to position ROI and risk reduction",
    ],
    demographics: {
      ageRange: { min: 35, max: 60 },
      genderBalance: "mixed",
      typicalLocations: ["enterprise HQs", "regional offices"],
      typicalProfessions: [
        "director",
        "VP",
        "head of department",
        "senior manager",
      ],
    },
    behaviorProfile: {
      summary:
        "Strategic and politically aware; they focus on risk, optics, and long-term impact more than day-to-day friction.",
      communicationStyle:
        "High-level, outcome-focused language; they care about metrics, narratives, and stakeholder alignment.",
      decisionStyle:
        "Consensus and risk-managed — they seek validation from peers, data, and trusted team members.",
      riskToleranceHint: "low",
      skepticismHint: "medium",
    },
    defaultPersonaCount: 6,
    diversityFocus: "focused",
  },
  {
    id: "students-and-early-career",
    name: "Students & Early Career",
    shortLabel: "18–28, mobile-first",
    description:
      "Students and early-career professionals who are mobile-first, budget-conscious, and constantly switching between learning, work, and social life.",
    exampleUseCases: [
      "Evaluating consumer apps or learning platforms",
      "Exploring acquisition and retention levers for young users",
    ],
    demographics: {
      ageRange: { min: 18, max: 28 },
      genderBalance: "mixed",
      typicalLocations: ["university towns", "big cities"],
      typicalProfessions: [
        "student",
        "intern",
        "junior employee",
        "working student",
      ],
    },
    behaviorProfile: {
      summary:
        "Curious, comparison-driven, and quick to drop tools that feel clunky or uncool.",
      communicationStyle:
        "Casual, emoji- and meme-aware, mixing school/work talk with personal life.",
      decisionStyle:
        "Experiment-heavy; they try many tools and commit only to those that integrate naturally into their routines.",
      riskToleranceHint: "high",
      skepticismHint: "low",
    },
    defaultPersonaCount: 10,
    diversityFocus: "broad",
  },
];

export function getPersonaTemplateById(
  id: string
): PersonaTemplateConfig | undefined {
  return PERSONA_TEMPLATES.find((t) => t.id === id);
}

