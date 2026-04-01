/**
 * One-tap prompts for activation and volume — used in persona creation growth UX.
 */
export type QuickStarter = {
  id: string;
  label: string;
  /** Full brief sent to generation / chat pipeline */
  prompt: string;
};

/** Default bias: ready to generate without blank-field friction */
export const DEFAULT_PERSONA_PROMPT =
  "Mid-career product manager at a B2B SaaS company who evaluates new tools monthly; cares about integrations, security, and clear pricing.";

export const QUICK_STARTERS: QuickStarter[] = [
  {
    id: "startup-founder",
    label: "Startup founder",
    prompt:
      "Early-stage startup founder (pre-seed to Series A) juggling fundraising, hiring, and product; uses Notion, Slack, and Figma; skeptical of enterprise sales cycles.",
  },
  {
    id: "student",
    label: "University student",
    prompt:
      "Full-time university student (20–24) studying computer science or design; budget-conscious; heavy mobile user; discovers apps via TikTok and friends.",
  },
  {
    id: "marketing-manager",
    label: "Marketing manager",
    prompt:
      "B2B marketing manager at a 50–200 person company; owns campaigns and martech stack; measured on pipeline and CAC; frustrated by fragmented analytics.",
  },
  {
    id: "night-shift-nurse",
    label: "Night-shift nurse",
    prompt:
      "Registered nurse on rotating night shifts at a regional hospital; relies on mobile apps for scheduling and messaging; burned out on admin work.",
  },
  {
    id: "smb-owner",
    label: "Small business owner",
    prompt:
      "Owner-operator of a local retail or services business (5–20 employees); makes software decisions quickly; values phone support and simple pricing.",
  },
  {
    id: "curiosity-abroad",
    label: "Same role, different country",
    prompt:
      "Same senior product role as a typical US SaaS buyer, but based in Germany: stronger privacy expectations, slower procurement, preference for EU-hosted tools.",
  },
];
