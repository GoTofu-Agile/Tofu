import type { DataSourceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { serpGet, getSerpApiMaxCallsPerRequest, isSerpApiConfigured } from "./client";
import { rowsFromAppleAppStoreSearchJson } from "./parse-apple-app-store-search";
import { rowsFromGoogleJobsJson } from "./parse-google-jobs";
import { rowsFromGoogleMapsJson } from "./parse-google-maps";
import { rowsFromGooglePlaySearchJson } from "./parse-google-play-search";
import { rowsFromGoogleScholarJson } from "./parse-google-scholar";
import { rowsFromYoutubeJson } from "./parse-youtube";
import type { SerpSupplementMode, SerpSupplementOptions } from "./serp-supplement-options";
import type { SerpSnippetRow } from "./serp-snippet-row";

export type { SerpSupplementOptions, SerpSupplementMode } from "./serp-supplement-options";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeDedupeKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.hostname.toLowerCase()}${path}`.slice(0, 2048);
  } catch {
    return url.toLowerCase().slice(0, 2048);
  }
}

export function organicFromGoogleJson(json: unknown): Array<{
  title: string;
  content: string;
  url: string;
  publishedAt: Date | null;
}> {
  const obj = json as {
    organic_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      date?: string;
    }>;
  };
  const rows = obj.organic_results ?? [];
  const out: Array<{ title: string; content: string; url: string; publishedAt: Date | null }> =
    [];
  for (const r of rows) {
    const title = (r.title ?? "").trim();
    const link = (r.link ?? "").trim();
    const snippet = (r.snippet ?? "").trim();
    if (!title || !link) continue;
    const content = snippet || title;
    if (!content) continue;
    let publishedAt: Date | null = null;
    if (r.date) {
      const t = Date.parse(r.date);
      if (!Number.isNaN(t)) publishedAt = new Date(t);
    }
    out.push({ title, content, url: link, publishedAt });
  }
  return out;
}

export function resultsFromGoogleNewsJson(json: unknown): Array<{
  title: string;
  content: string;
  url: string;
  publishedAt: Date | null;
}> {
  const obj = json as {
    news_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      date?: string;
      iso_date?: string;
    }>;
  };
  const rows = obj.news_results ?? [];
  const out: Array<{ title: string; content: string; url: string; publishedAt: Date | null }> =
    [];
  for (const r of rows) {
    const title = (r.title ?? "").trim();
    const link = (r.link ?? "").trim();
    const snippet = (r.snippet ?? "").trim();
    if (!title || !link) continue;
    const content = snippet || title;
    let publishedAt: Date | null = null;
    if (r.iso_date) {
      const t = Date.parse(r.iso_date);
      if (!Number.isNaN(t)) publishedAt = new Date(t);
    } else if (r.date) {
      const t = Date.parse(r.date);
      if (!Number.isNaN(t)) publishedAt = new Date(t);
    }
    out.push({ title, content, url: link, publishedAt });
  }
  return out;
}

type SaveSerpItem = {
  title: string;
  content: string;
  url: string;
  publishedAt: Date | null;
  sourceType: DataSourceType;
  searchQuery: string;
  searchSession: string;
  serpEngine: string;
  metadataExtra?: Record<string, unknown>;
};

async function saveSerpSnippets(groupId: string, items: SaveSerpItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const data = items.map((item) => ({
    personaGroupId: groupId,
    title: item.title.slice(0, 500),
    content: item.content,
    sourceType: item.sourceType,
    sourceUrl: item.url,
    sourceDomain: extractDomain(item.url) || null,
    publishedAt: item.publishedAt,
    relevanceScore: 0.65,
    searchQuery: item.searchQuery,
    searchSession: item.searchSession,
    metadata: {
      provider: "serpapi",
      serpEngine: item.serpEngine,
      ...(item.metadataExtra ?? {}),
    },
  }));
  await prisma.domainKnowledge.createMany({ data });
  return data.length;
}

const EXTENDED_MODE_ORDER: SerpSupplementMode[] = [
  "maps",
  "youtube",
  "jobs",
  "scholar",
  "app_store_search",
  "play_store_search",
  "forums",
];

type SiteForumStep = {
  kind: "site_forum";
  site: string;
  serpEngine: string;
  sourceType: DataSourceType;
};

type ExtendedStep =
  | { kind: "maps" | "youtube" | "jobs" | "scholar" | "app_store_search" | "play_store_search" }
  | SiteForumStep;

function expandExtendedSteps(modes: SerpSupplementMode[]): ExtendedStep[] {
  const set = new Set(modes);
  const ordered = EXTENDED_MODE_ORDER.filter((m) => set.has(m));
  const steps: ExtendedStep[] = [];
  for (const m of ordered) {
    if (m === "forums") {
      steps.push(
        {
          kind: "site_forum",
          site: "stackoverflow.com",
          serpEngine: "google_site_stackoverflow",
          sourceType: "FORUM",
        },
        {
          kind: "site_forum",
          site: "news.ycombinator.com",
          serpEngine: "google_site_hackernews",
          sourceType: "FORUM",
        },
        {
          kind: "site_forum",
          site: "trustpilot.com",
          serpEngine: "google_site_trustpilot",
          sourceType: "TRUSTPILOT",
        }
      );
    } else {
      steps.push({ kind: m });
    }
  }
  return steps;
}

function appleLangFromHl(hl: string): string {
  const h = hl.toLowerCase();
  if (h === "de") return "de-de";
  if (h === "fr") return "fr-fr";
  if (h === "es") return "es-es";
  return "en-us";
}

function filterNewRows(
  rows: SerpSnippetRow[],
  seen: Set<string>,
  limit: number
): SerpSnippetRow[] {
  const out: SerpSnippetRow[] = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    const key = r.dedupeKey ?? normalizeDedupeKey(r.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Runs a bounded set of SerpAPI searches (news + organic + Reddit; optional extended engines)
 * and appends rows to DomainKnowledge. Tolerates per-call failures.
 * Each successful engine invocation counts as one call toward the cap.
 */
export async function serpPersonaSupplement(
  groupId: string,
  queries: string[],
  searchSession: string,
  serpOptions?: SerpSupplementOptions | null
): Promise<{
  totalSaved: number;
  callsUsed: number;
  serpByEngine: Record<string, number>;
}> {
  if (!isSerpApiConfigured()) {
    return { totalSaved: 0, callsUsed: 0, serpByEngine: {} };
  }

  const maxCalls = getSerpApiMaxCallsPerRequest();
  let callsUsed = 0;
  let totalSaved = 0;
  const seenDedupe = new Set<string>();

  const baseQueries = queries.slice(0, 3).filter((q) => q.trim().length > 0);
  if (baseQueries.length === 0) {
    return { totalSaved: 0, callsUsed: 0, serpByEngine: {} };
  }

  const hl = (serpOptions?.hl ?? "en").trim() || "en";
  const gl = (serpOptions?.gl ?? "us").trim() || "us";
  const modes = serpOptions?.modes ?? [];
  const extendedSteps = modes.length > 0 ? expandExtendedSteps(modes) : [];

  const serpByEngine: Record<string, number> = {};

  const tryCall = async (tallyKey: string, fn: () => Promise<number>): Promise<void> => {
    if (callsUsed >= maxCalls) return;
    callsUsed += 1;
    try {
      const saved = await fn();
      totalSaved += saved;
      if (saved > 0) {
        serpByEngine[tallyKey] = (serpByEngine[tallyKey] ?? 0) + saved;
      }
    } catch (e) {
      console.error("[serpPersonaSupplement] call failed:", e);
    }
  };

  const primary = baseQueries[0]!;

  const persistRows = async (
    rows: SerpSnippetRow[],
    args: {
      sourceType: DataSourceType;
      searchQuery: string;
      serpEngine: string;
      slice: number;
      metadataExtra?: Record<string, unknown>;
    }
  ): Promise<number> => {
    const fresh = filterNewRows(rows, seenDedupe, args.slice);
    if (fresh.length === 0) return 0;
    return saveSerpSnippets(
      groupId,
      fresh.map((r) => ({
        title: r.title,
        content: r.content,
        url: r.url,
        publishedAt: r.publishedAt,
        sourceType: args.sourceType,
        searchQuery: args.searchQuery,
        searchSession,
        serpEngine: args.serpEngine,
        metadataExtra: args.metadataExtra,
      }))
    );
  };

  // --- Core chain (always) — fire all independent queries in parallel ---
  const coreTasks: Array<() => Promise<void>> = [
    () => tryCall("google_news", async () => {
      const json = await serpGet({ engine: "google_news", q: primary, hl, gl });
      const rows = resultsFromGoogleNewsJson(json);
      return persistRows(rows, {
        sourceType: "NEWS",
        searchQuery: `serp:google_news:${primary.slice(0, 120)}`,
        serpEngine: "google_news",
        slice: 6,
      });
    }),
    () => tryCall("google", async () => {
      const json = await serpGet({ engine: "google", q: primary, hl, gl, num: 10 });
      const rows = organicFromGoogleJson(json).map((r) => ({ ...r, dedupeKey: undefined }));
      return persistRows(rows, {
        sourceType: "MANUAL",
        searchQuery: `serp:google:${primary.slice(0, 120)}`,
        serpEngine: "google",
        slice: 6,
      });
    }),
    () => tryCall("google_site_reddit", async () => {
      const q = `site:reddit.com ${primary}`.slice(0, 400);
      const json = await serpGet({ engine: "google", q, hl, gl, num: 8 });
      const rows = organicFromGoogleJson(json);
      return persistRows(rows, {
        sourceType: "REDDIT",
        searchQuery: `serp:google_reddit:${primary.slice(0, 100)}`,
        serpEngine: "google_site_reddit",
        slice: 5,
      });
    }),
  ];

  if (baseQueries.length > 1) {
    const second = baseQueries[1]!;
    coreTasks.push(() => tryCall("google_news", async () => {
      const json = await serpGet({ engine: "google_news", q: second, hl, gl });
      const rows = resultsFromGoogleNewsJson(json);
      return persistRows(rows, {
        sourceType: "NEWS",
        searchQuery: `serp:google_news:${second.slice(0, 120)}`,
        serpEngine: "google_news",
        slice: 4,
      });
    }));
  }

  // Cap total calls: slice to what the budget allows before firing
  await Promise.allSettled(coreTasks.slice(0, maxCalls).map((fn) => fn()));

  // --- Extended modes (optional) ---
  const localArea = serpOptions?.localArea?.trim();
  const jobQuery = (serpOptions?.jobQuery?.trim() || primary).slice(0, 400);
  const appDiscoveryQuery = serpOptions?.appDiscoveryQuery?.trim();

  for (const step of extendedSteps) {
    if (callsUsed >= maxCalls) break;

    if (step.kind === "maps") {
      if (!localArea) continue;
      const qMaps = `${primary} ${localArea}`.trim().slice(0, 400);
      await tryCall("google_maps", async () => {
        const json = await serpGet({
          engine: "google_maps",
          q: qMaps,
          hl,
          gl,
          type: "search",
        });
        const rows = rowsFromGoogleMapsJson(json);
        return persistRows(rows, {
          sourceType: "MANUAL",
          searchQuery: `serp:google_maps:${qMaps.slice(0, 120)}`,
          serpEngine: "google_maps",
          slice: 8,
          metadataExtra: { kind: "local_place" },
        });
      });
      continue;
    }

    if (step.kind === "youtube") {
      await tryCall("youtube", async () => {
        const json = await serpGet({
          engine: "youtube",
          search_query: primary.slice(0, 400),
          hl,
          gl,
        });
        const rows = rowsFromYoutubeJson(json);
        return persistRows(rows, {
          sourceType: "SOCIAL_MEDIA",
          searchQuery: `serp:youtube:${primary.slice(0, 120)}`,
          serpEngine: "youtube",
          slice: 8,
        });
      });
      continue;
    }

    if (step.kind === "jobs") {
      await tryCall("google_jobs", async () => {
        const json = await serpGet({
          engine: "google_jobs",
          q: jobQuery,
          hl,
          gl,
        });
        const rows = rowsFromGoogleJobsJson(json);
        return persistRows(rows, {
          sourceType: "MANUAL",
          searchQuery: `serp:google_jobs:${jobQuery.slice(0, 120)}`,
          serpEngine: "google_jobs",
          slice: 8,
          metadataExtra: { kind: "job_listing" },
        });
      });
      continue;
    }

    if (step.kind === "scholar") {
      await tryCall("google_scholar", async () => {
        const json = await serpGet({
          engine: "google_scholar",
          q: primary.slice(0, 400),
          hl,
        });
        const rows = rowsFromGoogleScholarJson(json);
        return persistRows(rows, {
          sourceType: "ACADEMIC",
          searchQuery: `serp:google_scholar:${primary.slice(0, 120)}`,
          serpEngine: "google_scholar",
          slice: 8,
        });
      });
      continue;
    }

    if (step.kind === "app_store_search") {
      if (!appDiscoveryQuery) continue;
      await tryCall("apple_app_store", async () => {
        const json = await serpGet({
          engine: "apple_app_store",
          term: appDiscoveryQuery.slice(0, 200),
          country: /^[a-z]{2}$/i.test(gl) ? gl.toLowerCase() : "us",
          lang: appleLangFromHl(hl),
        });
        const rows = rowsFromAppleAppStoreSearchJson(json);
        return persistRows(rows, {
          sourceType: "MANUAL",
          searchQuery: `serp:apple_app_store:${appDiscoveryQuery.slice(0, 120)}`,
          serpEngine: "apple_app_store",
          slice: 10,
          metadataExtra: { kind: "app_discovery", store: "apple" },
        });
      });
      continue;
    }

    if (step.kind === "play_store_search") {
      if (!appDiscoveryQuery) continue;
      await tryCall("google_play_search", async () => {
        const json = await serpGet({
          engine: "google_play",
          q: appDiscoveryQuery.slice(0, 200),
          hl,
          gl,
          store: "apps",
        });
        const rows = rowsFromGooglePlaySearchJson(json);
        return persistRows(rows, {
          sourceType: "MANUAL",
          searchQuery: `serp:google_play:${appDiscoveryQuery.slice(0, 120)}`,
          serpEngine: "google_play_search",
          slice: 10,
          metadataExtra: { kind: "app_discovery", store: "google_play" },
        });
      });
      continue;
    }

    if (step.kind === "site_forum") {
      const site = step.site;
      await tryCall(step.serpEngine, async () => {
        const q = `site:${site} ${primary}`.slice(0, 400);
        const json = await serpGet({
          engine: "google",
          q,
          hl,
          gl,
          num: 8,
        });
        const rows = organicFromGoogleJson(json);
        return persistRows(rows, {
          sourceType: step.sourceType,
          searchQuery: `serp:${step.serpEngine}:${primary.slice(0, 80)}`,
          serpEngine: step.serpEngine,
          slice: 5,
        });
      });
    }
  }

  return { totalSaved, callsUsed, serpByEngine };
}
