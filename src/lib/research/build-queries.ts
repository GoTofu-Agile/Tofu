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
