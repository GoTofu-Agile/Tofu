export interface ProductInfo {
  productName: string;
  oneLiner: string;
  targetAudience: string;
  competitors: string[];
  researchGoals: string[];
}

interface SearchPlan {
  query: string;
  includeDomains?: string[];
  label: string; // human-readable description
}

export function buildSearchQueries(info: ProductInfo): SearchPlan[] {
  const queries: SearchPlan[] = [];
  const { productName, oneLiner, targetAudience, competitors, researchGoals } =
    info;

  // 1. Reddit: pain points and discussions about the domain
  queries.push({
    query: `${oneLiner} user pain points frustrations problems`,
    includeDomains: ["reddit.com"],
    label: `Reddit discussions about ${targetAudience} pain points`,
  });

  // 2. Reddit: competitor-specific discussions
  if (competitors.length > 0) {
    const competitorList = competitors.slice(0, 3).join(" OR ");
    queries.push({
      query: `${competitorList} review complaints what I wish`,
      includeDomains: ["reddit.com"],
      label: `Reddit reviews of ${competitors.slice(0, 3).join(", ")}`,
    });
  }

  // 3. App Store / Play Store reviews for competitors
  if (competitors.length > 0) {
    queries.push({
      query: `${competitors[0]} app review user feedback`,
      includeDomains: [
        "apps.apple.com",
        "play.google.com",
        "appfollow.io",
        "sensortower.com",
      ],
      label: `App store reviews for ${competitors[0]}`,
    });
  }

  // 4. ProductHunt / G2 / Trustpilot reviews
  queries.push({
    query: `${productName || oneLiner} user experience feedback`,
    includeDomains: [
      "producthunt.com",
      "g2.com",
      "trustpilot.com",
      "capterra.com",
    ],
    label: "Product review platforms",
  });

  // 5. Domain-specific forums and communities
  queries.push({
    query: `${targetAudience} ${oneLiner} forum community discussion experience`,
    label: `Community discussions about ${targetAudience}`,
  });

  // 6. Research-goal-specific queries
  const goalQueries: Record<string, string> = {
    pain_points: `${targetAudience} biggest problems challenges frustrations with ${oneLiner}`,
    feature_feedback: `${oneLiner} missing features feature requests what users want`,
    onboarding_ux: `${oneLiner} onboarding first experience getting started confusion`,
    pricing_sensitivity: `${oneLiner} pricing too expensive worth it alternatives cheaper`,
    user_behavior: `${targetAudience} daily workflow how they use tools habits`,
    market_trends: `${oneLiner} industry trends 2024 2025 market changes`,
  };

  for (const goal of researchGoals) {
    const q = goalQueries[goal];
    if (q) {
      queries.push({
        query: q,
        label: `Research: ${goal.replace("_", " ")}`,
      });
    }
  }

  return queries;
}

export const RESEARCH_GOALS = [
  { value: "pain_points", label: "Pain Points & Frustrations" },
  { value: "feature_feedback", label: "Feature Feedback & Requests" },
  { value: "onboarding_ux", label: "Onboarding & First-Time UX" },
  { value: "pricing_sensitivity", label: "Pricing Sensitivity" },
  { value: "user_behavior", label: "User Behavior & Workflows" },
  { value: "market_trends", label: "Market Trends" },
] as const;

// Source categories for unified creation flow
export const RESEARCH_SOURCES = [
  {
    id: "reddit",
    label: "Reddit",
    description: "Discussions, complaints, recommendations",
    domains: ["reddit.com"],
  },
  {
    id: "app_store",
    label: "App Store / Play Store",
    description: "App reviews and ratings",
    domains: ["apps.apple.com", "play.google.com", "appfollow.io", "sensortower.com"],
  },
  {
    id: "review_sites",
    label: "Review Sites",
    description: "G2, Trustpilot, ProductHunt, Capterra",
    domains: ["producthunt.com", "g2.com", "trustpilot.com", "capterra.com"],
  },
  {
    id: "forums",
    label: "Forums & Communities",
    description: "Stack Overflow, Quora, niche forums",
    domains: undefined as string[] | undefined,
  },
  {
    id: "news",
    label: "News & Articles",
    description: "Tech blogs, industry news",
    domains: undefined as string[] | undefined,
  },
] as const;

/** All research source IDs — used when the UI does not let users toggle sources. */
export const ALL_RESEARCH_SOURCE_IDS: string[] = RESEARCH_SOURCES.map((s) => s.id);

export interface ContextQueryInput {
  targetUserRole: string;
  industry?: string | null;
  painPoints?: string[];
  domainContext: string;
  selectedSources: string[];
  depth: "quick" | "deep";
}

interface SearchPlanWithDomains {
  query: string;
  includeDomains?: string[];
  label: string;
}

export function buildQueriesFromContext(input: ContextQueryInput): SearchPlanWithDomains[] {
  const queries: SearchPlanWithDomains[] = [];
  const { targetUserRole, industry, painPoints, selectedSources, depth } = input;
  const context = [targetUserRole, industry].filter(Boolean).join(" ");

  // Build queries per selected source
  for (const sourceId of selectedSources) {
    const source = RESEARCH_SOURCES.find((s) => s.id === sourceId);
    if (!source) continue;

    if (sourceId === "reddit") {
      queries.push({
        query: `${context} user experience pain points frustrations`,
        includeDomains: ["reddit.com"],
        label: `Reddit: ${targetUserRole} discussions`,
      });
      if (depth === "deep" && painPoints && painPoints.length > 0) {
        queries.push({
          query: `${context} ${painPoints.slice(0, 2).join(" ")} reddit`,
          includeDomains: ["reddit.com"],
          label: `Reddit: specific pain points`,
        });
      }
    } else if (sourceId === "app_store") {
      queries.push({
        query: `${context} app review feedback`,
        includeDomains: source.domains as string[],
        label: "App Store / Play Store reviews",
      });
    } else if (sourceId === "review_sites") {
      queries.push({
        query: `${context} product review user feedback`,
        includeDomains: source.domains as string[],
        label: "Review sites (G2, Trustpilot, ProductHunt)",
      });
    } else if (sourceId === "forums") {
      queries.push({
        query: `${context} forum community discussion experience challenges`,
        label: `Forums: ${targetUserRole} communities`,
      });
      if (depth === "deep") {
        queries.push({
          query: `${context} daily workflow tools habits`,
          label: `Forums: ${targetUserRole} workflows`,
        });
      }
    } else if (sourceId === "news") {
      queries.push({
        query: `${context} trends challenges industry 2025`,
        label: `News about ${industry || targetUserRole}`,
      });
    }
  }

  // If deep mode + pain points, add targeted queries
  if (depth === "deep" && painPoints && painPoints.length >= 2) {
    queries.push({
      query: `${targetUserRole} "${painPoints[0]}" OR "${painPoints[1]}"`,
      label: "Targeted pain point search",
    });
  }

  return queries;
}

export const TARGET_AUDIENCES = [
  "B2C Consumers",
  "B2B SaaS Users",
  "Healthcare Professionals",
  "Education / Students",
  "Finance / Fintech Users",
  "E-Commerce Shoppers",
  "Developers / Engineers",
  "Small Business Owners",
  "Parents / Families",
  "Fitness / Wellness",
  "Other",
] as const;
