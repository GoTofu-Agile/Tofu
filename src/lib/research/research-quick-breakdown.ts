import type { DataSourceType } from "@prisma/client";
import { labelForDataSourceType } from "@/lib/personas/persona-provenance-display";

/** What was searched / saved — no vendor names (UI-facing). */
const SERP_DATA_KIND_LABELS: Record<string, string> = {
  google_news: "News articles",
  google: "Web pages",
  google_site_reddit: "Reddit discussions",
  google_maps: "Maps & local places",
  youtube: "YouTube",
  google_jobs: "Job listings",
  google_scholar: "Scholarly sources",
  apple_app_store: "App Store listings",
  google_play_search: "Play Store listings",
  google_site_stackoverflow: "Stack Overflow",
  google_site_hackernews: "Hacker News",
  google_site_trustpilot: "Trustpilot reviews",
};

export function labelForSerpEngineKey(key: string): string {
  return SERP_DATA_KIND_LABELS[key] ?? key.replace(/_/g, " ");
}

/** Merge one `/api/research/quick` response into running tallies (prefixed keys). */
export function mergeQuickResearchBreakdown(
  prev: Record<string, number>,
  json: {
    tavilyBySourceType?: Record<string, number>;
    serpByEngine?: Record<string, number>;
  }
): Record<string, number> {
  const out = { ...prev };
  for (const [k, v] of Object.entries(json.tavilyBySourceType ?? {})) {
    if (typeof v === "number" && v > 0) {
      const key = `tavily:${k}`;
      out[key] = (out[key] ?? 0) + v;
    }
  }
  for (const [k, v] of Object.entries(json.serpByEngine ?? {})) {
    if (typeof v === "number" && v > 0) {
      const key = `serp:${k}`;
      out[key] = (out[key] ?? 0) + v;
    }
  }
  return out;
}

/** User-facing: what kind of data was gathered (not which API). */
export function humanLabelForBreakdownKey(key: string): string {
  if (key.startsWith("tavily:")) {
    const t = key.slice(7) as DataSourceType;
    return labelForDataSourceType(t);
  }
  if (key.startsWith("serp:")) {
    return labelForSerpEngineKey(key.slice(5));
  }
  return key;
}

export function sumResearchBreakdownSnippets(bySource: Record<string, number>): number {
  let s = 0;
  for (const [k, v] of Object.entries(bySource)) {
    if (k.startsWith("tavily:") || k.startsWith("serp:")) s += v;
  }
  return s;
}
