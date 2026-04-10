import type { ExtractedContext } from "@/lib/validation/schemas";
import type { SerpSupplementMode, SerpSupplementOptions } from "./serp-supplement-options";

/**
 * Optional SerpAPI modes for chat-based persona creation when the user picks deep research.
 * Uses extracted demographics for local Maps; role/industry for jobs and app-store keyword search.
 */
export function serpOptionsForDeepResearchExtracted(
  extracted: ExtractedContext
): SerpSupplementOptions {
  const modes = new Set<SerpSupplementMode>(["youtube", "jobs", "scholar", "forums"]);
  if (extracted.demographicsHints?.trim()) {
    modes.add("maps");
  }
  const jobParts = [extracted.targetUserRole, extracted.industry].filter(Boolean).join(" ").trim();
  if (jobParts) {
    modes.add("app_store_search");
    modes.add("play_store_search");
  }
  const appDiscoveryQuery = jobParts ? `${jobParts} app`.slice(0, 200) : undefined;
  return {
    modes: Array.from(modes),
    localArea: extracted.demographicsHints?.trim() || undefined,
    jobQuery: jobParts || undefined,
    appDiscoveryQuery,
  };
}

/** Deep-search chat pipeline without structured extraction (no Maps unless caller adds localArea later). */
export function serpOptionsForPromptDeepSearch(prompt: string): SerpSupplementOptions {
  const q = prompt.trim().slice(0, 400);
  return {
    modes: ["youtube", "jobs", "scholar", "forums", "app_store_search", "play_store_search"],
    jobQuery: q,
    appDiscoveryQuery: `${q} app`.slice(0, 200),
  };
}
