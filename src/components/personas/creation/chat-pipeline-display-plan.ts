import type { ChatDataSourceId } from "./chat-research-pipeline";

export type DisplayOrgContext = { industry?: string; targetAudience?: string };

function makePicker(seed: number) {
  const used = new Set<string>();
  let n = 0;
  return (pool: readonly string[]) => {
    const shuffled: string[] = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.abs((seed + n * 19 + i * 13) % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    for (const s of shuffled) {
      if (!used.has(s)) {
        used.add(s);
        n++;
        return s;
      }
    }
    n++;
    return pool[Math.abs((seed + n) % pool.length)]!;
  };
}

/** ≥50 distinct log-style lines (same voice as existing UI) */
export const LOG_POOLS = {
  warmup: [
    "Warming up crawl workers",
    "Allocating search budget",
    "Resolving query intent",
    "Parsing audience keywords",
    "Normalizing input signals",
    "Opening indexed cache layer",
    "Handshaking with search mesh",
    "Spinning up retrieval workers",
    "Calibrating relevance thresholds",
    "Queueing first-pass probes",
    "Mapping entity candidates",
    "Priming snippet extractors",
  ],
  forumPass: [
    "Scanning Reddit & niche forums",
    "Crawling discussion threads",
    "Harvesting forum sentiment",
    "Pulling thread excerpts",
    "Indexing community complaints",
    "Sampling subreddit discourse",
    "Tracing recurring pain points",
    "Collecting verbatim quotes",
    "Cross-linking thread topics",
    "Deep-reading comment chains",
  ],
  bridge: [
    "Deduplicating overlapping hits",
    "Scoring source trust",
    "Merging near-duplicate snippets",
    "Tagging topical clusters",
    "Re-ranking by recency",
    "Filtering low-signal pages",
    "Expanding synonym variants",
    "Tightening query focus",
    "Backfilling coverage gaps",
    "Validating link health",
  ],
  /** Consumer / professional-audience web (teachers, patients, etc.) */
  webPublic: [
    "Crawling web addresses",
    "Resolving public site URLs",
    "Mapping open web sources",
    "Following indexed page trails",
    "Pulling from public directories",
    "Harvesting institutional pages",
    "Scanning professional listings",
    "Collecting open-profile signals",
    "Tracing citation graphs",
    "Anchoring to credible domains",
  ],
  /** B2B / corporate tilt */
  webCorporate: [
    "Resolving corporate web addresses",
    "Crawling company sites",
    "Mapping vendor landing pages",
    "Indexing leadership bios",
    "Pulling careers & about pages",
    "Tracing subsidiary domains",
    "Harvesting press-room URLs",
    "Following investor relations links",
    "Collecting compliance footers",
    "Scanning industry vertical sites",
  ],
  cvStyle: [
    "Sampling anonymized CV patterns",
    "Inferring seniority bands",
    "Sketching role archetypes",
    "Cross-checking title taxonomies",
    "Estimating tenure distributions",
    "Pulling skill co-occurrence",
    "Aligning to industry ladders",
    "Stress-testing edge cases",
    "Balancing experience levels",
    "Grounding in hiring norms",
  ],
  appStore: [
    "Locating App Store listing",
    "Resolving bundle identifier",
    "Fetching storefront metadata",
    "Pulling recent review stream",
    "Scoring review sentiment",
    "Clustering star-rating spikes",
    "Extracting feature requests",
    "Tagging churn language",
    "Correlating version complaints",
    "Sampling international reviews",
  ],
  preGenerate: [
    "Correlating cross-source signals",
    "Stitching persona evidence",
    "Compressing research bundle",
    "Locking grounding facts",
    "Resolving conflicting claims",
    "Weighting source authority",
    "Building trait hypotheses",
    "Seeding diversity constraints",
    "Finalizing knowledge pack",
    "Handing off to generator",
  ],
  generateCap: [
    "Synthesizing persona profiles",
    "Weaving narratives from data",
    "Generating grounded personas",
    "Materializing audience archetypes",
  ],
} as const;

export type DisplayStepBackend =
  | { kind: "visual"; ms: number }
  | { kind: "tavily" }
  | { kind: "appstore" }
  | { kind: "generation" };

export interface ChatDisplayStep {
  id: string;
  label: string;
  backend: DisplayStepBackend;
}

function inferWebPool(prompt: string, org?: DisplayOrgContext): "webPublic" | "webCorporate" {
  const t = `${prompt} ${org?.industry ?? ""} ${org?.targetAudience ?? ""}`.toLowerCase();
  const b2b =
    /\b(enterprise|b2b|saas|procurement|vendor|crm|erp|sales team|founders?|startup|hr\b|recruiter|compliance|revenue ops|account executive)\b/.test(
      t
    );
  const consumer =
    /\b(teachers?|students?|parents?|patients?|gamers?|shoppers?|homeowners?|drivers?|nurses?|doctors?|between\s+\d+\s+and\s+\d+|age\s+\d+|years?\s+old)\b/.test(
      t
    );
  if (b2b && !consumer) return "webCorporate";
  if (consumer && !b2b) return "webPublic";
  if (b2b) return "webCorporate";
  return "webPublic";
}

function sourceFlags(source: ChatDataSourceId) {
  return {
    tavilyForum: source === "all" || source === "deep-search",
    tavilyWeb: source === "all" || source === "company-urls" || source === "deep-search",
    cv: source === "all" || source === "cvs",
    app: source === "all" || source === "app-store",
    /** templates: prompt-only path */
    templatesOnly: source === "templates",
  };
}

/**
 * Builds 7–10 display steps with varied labels; maps real work to tavily / appstore / generation slots.
 */
export function buildChatDisplayPipeline(
  sourceId: ChatDataSourceId,
  prompt: string,
  orgContext: DisplayOrgContext | undefined,
  runNonce: number
): ChatDisplayStep[] {
  const seed = hashPrompt(`${prompt}\0${sourceId}\0${runNonce}`);
  const flags = sourceFlags(sourceId);
  const webKey = inferWebPool(prompt, orgContext);
  const webPool = LOG_POOLS[webKey === "webPublic" ? "webPublic" : "webCorporate"];

  const pick = makePicker(seed);

  const steps: ChatDisplayStep[] = [];
  let idx = 0;
  const add = (label: string, backend: DisplayStepBackend) => {
    steps.push({ id: `pipe-${idx++}`, label, backend });
  };

  /** Target total steps 7–10 */
  const targetTotal = 7 + Math.abs(seed % 4);
  const visualMs = () => 320 + Math.abs((seed + idx * 7) % 180);

  if (flags.templatesOnly) {
    while (steps.length < Math.min(targetTotal - 1, 9)) {
      add(pick(LOG_POOLS.warmup), { kind: "visual", ms: visualMs() });
    }
    add(pick(LOG_POOLS.generateCap), { kind: "generation" });
    steps.forEach((s, i) => {
      s.id = `pipe-${i}`;
    });
    return steps;
  }

  // --- Visual preamble ---
  const preCount =
    flags.tavilyForum || flags.tavilyWeb ? 1 + Math.abs(seed % 2) : 2 + Math.abs(seed % 2);
  for (let i = 0; i < preCount; i++) add(pick(LOG_POOLS.warmup), { kind: "visual", ms: visualMs() });

  if (flags.tavilyForum) {
    add(pick(LOG_POOLS.forumPass), { kind: "tavily" });
  }

  const bridgeCount =
    flags.tavilyForum && flags.tavilyWeb
      ? 1 + Math.abs(seed % 2)
      : flags.tavilyWeb || flags.tavilyForum
        ? 1
        : 2 + Math.abs(seed % 3);
  for (let i = 0; i < bridgeCount; i++) add(pick(LOG_POOLS.bridge), { kind: "visual", ms: visualMs() });

  if (flags.tavilyWeb) {
    add(pick(webPool), { kind: "tavily" });
  }

  if (flags.cv) {
    const cvN = 1 + Math.abs(seed % 2);
    for (let i = 0; i < cvN; i++) add(pick(LOG_POOLS.cvStyle), { kind: "visual", ms: visualMs() });
  }

  if (flags.app) {
    const appPre = 1 + Math.abs(seed % 2);
    for (let i = 0; i < appPre; i++) add(pick(LOG_POOLS.appStore), { kind: "visual", ms: visualMs() });
    add(pick(LOG_POOLS.appStore), { kind: "appstore" });
  }

  // Pre-generate visuals + cap
  while (steps.length < targetTotal - 1) {
    add(pick(LOG_POOLS.preGenerate), { kind: "visual", ms: visualMs() });
    if (steps.length >= 9) break;
  }

  add(pick(LOG_POOLS.generateCap), { kind: "generation" });

  // If we overshot (rare), trim middle visuals only (keep all backend + generation)
  const backendIdx = steps
    .map((s, i) => (s.backend.kind !== "visual" ? i : -1))
    .filter((i) => i >= 0);
  while (steps.length > 10) {
    const visIdx = steps.findIndex((s, i) => s.backend.kind === "visual" && !backendIdx.includes(i));
    if (visIdx === -1) break;
    steps.splice(visIdx, 1);
  }
  while (steps.length < 7) {
    steps.splice(-1, 0, {
      id: `pipe-${idx++}`,
      label: pick(LOG_POOLS.bridge),
      backend: { kind: "visual", ms: visualMs() },
    });
  }

  // Re-assign stable ids in order
  steps.forEach((s, i) => {
    s.id = `pipe-${i}`;
  });

  return steps;
}

function hashPrompt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
