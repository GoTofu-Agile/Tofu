export type HandlyTrackKey = "gtm" | "product";

export type HandlyTrackOrgSpec = {
  key: HandlyTrackKey;
  slug: string;
  name: string;
};

export type HandlyPersonaGroupSpec = {
  /** Stable key for idempotent seeding */
  key: string;
  /** PersonaGroup.name (also used as primary anchoring label) */
  label: string;
  /** Extra constraints for this persona group */
  notes?: string;
};

export const HANDLY_TRACK_ORGS: HandlyTrackOrgSpec[] = [
  {
    key: "gtm",
    slug: "handly-gtm",
    name: "Track 1 - Go-to-Market",
  },
  {
    key: "product",
    slug: "handly-product",
    name: "Track 2 - Product",
  },
];

/** Workspace slugs for Handly Track 1 / Track 2 (UI treats these differently from other orgs). */
export const HANDLY_TRACK_ORG_SLUGS: readonly string[] = HANDLY_TRACK_ORGS.map(
  (o) => o.slug
);

/**
 * English product context (shared for both tracks).
 * Source: user-provided German description, translated/condensed for persona generation.
 */
export const HANDLY_PRODUCT_CONTEXT_EN = `Handly is a business partner for roofing companies in Germany. They provide a complete package to help roofing contractors win more work predictably: they build professional websites, improve Google visibility, and run ads in the roofing company's name (not via lead portals). They also build partnerships with property management companies, energy consultants, and architects to generate predictable projects.

In parallel, Handly offers an app for AI-assisted quoting and invoicing, project management, and digital bookkeeping. They also provide a dedicated phone office assistant who answers calls and qualifies leads. For growing contractors, they support hiring and process building. The service is delivered as an all-in-one package with a personal account manager. Handly currently works with 30+ roofing companies as partners.`;

export const HANDLY_TRACK_GROUPS: Record<HandlyTrackKey, HandlyPersonaGroupSpec[]> = {
  gtm: [
    {
      key: "owner-operator",
      label: "Owner-Operator",
      notes:
        "Solo decision-maker, hands-on roofer, phone-first, high admin pain. Largest segment. Conversion: medium.",
    },
    {
      key: "growth-stage-owner",
      label: "Growth-Stage Owner",
      notes:
        "5–20 employees, stepping back from roofing, feels operational gaps acutely. Priority: build first. Conversion: highest.",
    },
    {
      key: "inherited-business-owner",
      label: "Inherited Business Owner",
      notes:
        "Took over family firm, digitally native, wants to modernise. Priority: build second. Conversion: high.",
    },
    {
      key: "reluctant-non-adopter",
      label: "Reluctant Non-Adopter",
      notes:
        "Actively resistant to software, rationalised the pain away. Conversion: very low.",
    },
    {
      key: "handly-bdr",
      label: "Sales Representative",
      notes: "Internal persona. Consumes pipeline output for outreach. WhatsApp + spreadsheet native.",
    },
    {
      key: "office-manager-buyer-signal",
      label: "Office Manager",
      notes:
        "Often the real economic buyer inside the roofing company. Strong enrichment signal for conversion.",
    },
  ],
  product: [
    {
      key: "urgent-homeowner",
      label: "Urgent Homeowner",
      notes:
        "Active leak or storm damage, high anxiety, low patience, photo-first. Core bot flow.",
    },
    {
      key: "planning-homeowner",
      label: "Planning Homeowner",
      notes:
        "No emergency, comparing quotes, tolerates more questions. Secondary bot path.",
    },
    {
      key: "sceptical-homeowner",
      label: "Sceptical Homeowner",
      notes:
        "Burned before, tests the bot, disengages at first robotic response. Adversarial test case.",
    },
    {
      key: "hausverwaltung-representative",
      label: "Hausverwaltung Representative",
      notes:
        "Formal, process-driven, sends reference numbers, expects written confirmation, cannot schedule alone. Needs formal routing.",
    },
    {
      key: "office-manager-dispatcher",
      label: "Office Manager / Dispatcher",
      notes:
        "Handles WhatsApp inbox, rescheduling, homeowner follow-up. Defines handoff logic.",
    },
    {
      key: "quoting-roofer",
      label: "Quoting Roofer",
      notes:
        "Needs fast, accurate m² output to close quotes in under 2 minutes. Primary drone tool flow.",
    },
    {
      key: "office-based-estimator",
      label: "Office-Based Estimator",
      notes:
        "Never on-site, works from satellite imagery, needs remote measurement + pitch detection. Drives satellite integration feature.",
    },
    {
      key: "cautious-senior-roofer",
      label: "Cautious Senior Roofer",
      notes:
        "20+ years experience, doesn't trust AI for safety-critical work. Drives accuracy proof flow.",
    },
    {
      key: "quote-scrutinising-homeowner",
      label: "Quote-Scrutinising Homeowner",
      notes:
        "Asks “how did you measure that?”. Drives shareable provenance output.",
    },
  ],
};

export function buildHandlyOrgProductContextFields() {
  return {
    productName: "Handly",
    productDescription: HANDLY_PRODUCT_CONTEXT_EN,
    industry: "Roofing services (Germany)",
    targetAudience:
      "Roofing companies in Germany (owners, office managers) and their end customers (homeowners, property management).",
    competitors:
      "Lead portals, generic agency services, contractor SaaS (quoting/invoicing/project management), call answering services",
    setupCompleted: true,
  };
}

/**
 * This becomes `PersonaGroup.domainContext` and is passed into persona generation.
 * We intentionally anchor the persona group label here so we don't need to change the generator prompt logic.
 */
export function buildHandlyPersonaGroupDomainContext(input: {
  track: HandlyTrackOrgSpec;
  group: HandlyPersonaGroupSpec;
}): string {
  const { track, group } = input;
  const parts = [
    `Product: Handly`,
    `Track: ${track.name}`,
    `Target persona group: ${group.label}`,
    group.notes ? `Notes: ${group.notes}` : null,
    "",
    `Product context:\n${HANDLY_PRODUCT_CONTEXT_EN}`,
    "",
    `Generation instructions: Create personas that clearly belong to the target persona group (${group.label}) and reflect the product context above. Keep the 10 personas in this group meaningfully distinct from each other.`,
  ].filter(Boolean);

  return parts.join("\n");
}

