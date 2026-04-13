import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { getModel } from "@/lib/ai/provider";
import { serpGet, isSerpApiConfigured } from "@/lib/research/serpapi/client";
import { rowsFromAppleAppStoreSearchJson } from "@/lib/research/serpapi/parse-apple-app-store-search";
import { appStoreAudienceMappingResultSchema } from "@/lib/validation/schemas";

const requestSchema = z.object({
  groupId: z.string().min(1),
  audience: z.string().min(3).max(800),
  maxApps: z.number().int().min(1).max(5).optional(),
});

function isAppStoreUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.includes("apps.apple.com");
  } catch {
    return false;
  }
}

function normalizeAppStoreUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("apps.apple.com")) return null;
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/+$/, "") || u.pathname;
    u.pathname = path;
    return u.toString();
  } catch {
    return null;
  }
}

function dedupeCandidates(
  items: { title: string; content: string; url: string }[]
) {
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const r of items) {
    const norm = normalizeAppStoreUrl(r.url);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push({ ...r, url: norm });
  }
  return out;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await getUser(authUser.id);
  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 401 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const group = await getPersonaGroup(body.groupId);
  if (!group) {
    return Response.json({ error: "Group not found" }, { status: 404 });
  }

  const role = await getUserRole(group.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const maxApps = Math.min(5, body.maxApps ?? 5);
  const audience = body.audience.trim();

  if (!isSerpApiConfigured()) {
    return Response.json({ apps: [] as unknown[], serpDisabled: true });
  }

  let candidates: { title: string; content: string; url: string }[] = [];

  try {
    const [r1, r2] = await Promise.all([
      serpGet({ engine: "apple_app_store", term: `${audience} apps` }),
      serpGet({ engine: "apple_app_store", term: `${audience} best apps` }),
    ]);
    const rows = [
      ...rowsFromAppleAppStoreSearchJson(r1),
      ...rowsFromAppleAppStoreSearchJson(r2),
    ].filter((r) => isAppStoreUrl(r.url));
    candidates = dedupeCandidates(rows);
  } catch (e) {
    console.error("[appstore-from-audience] SerpAPI search failed", e);
    return Response.json(
      { error: "App discovery search failed. Try again or paste an App Store URL." },
      { status: 502 }
    );
  }

  if (candidates.length === 0) {
    return Response.json({ apps: [] });
  }

  const candidateBlock = candidates
    .slice(0, 12)
    .map(
      (c, i) =>
        `${i + 1}. title: ${c.title}\n   url: ${c.url}\n   snippet: ${c.content.slice(0, 400)}`
    )
    .join("\n\n");

  // Fallback: pick top candidates without LLM ranking
  let apps = candidates.slice(0, maxApps).map((c) => ({
    appName:
      c.title.replace(/\s*[-|–—]\s*App Store.*$/i, "").trim() || c.title.slice(0, 80),
    appUrl: c.url,
    reasoning:
      "Selected from App Store search results as a plausible match for this audience based on the page title and snippet.",
  }));

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: appStoreAudienceMappingResultSchema,
      prompt: `You map a target user audience to real iOS App Store app listing URLs for review research.

Target audience:
"${audience}"

Candidate pages (only use URLs from this list exactly as given; do not invent URLs):
${candidateBlock}

Task:
- Pick up to ${maxApps} apps that best match the audience for grounded App Store review research.
- For each, output appName (short product name), appUrl (must be one of the candidate URLs, https, apps.apple.com), and reasoning (2–4 sentences: why this app fits the audience, what user needs it addresses — practical, not marketing fluff).
- Order from best match first.
- If none fit well, return an empty apps array.`,
    });

    const filtered = object.apps
      .filter((a) => {
        const norm = normalizeAppStoreUrl(a.appUrl);
        return norm && candidates.some((c) => normalizeAppStoreUrl(c.url) === norm);
      })
      .map((a) => ({ ...a, appUrl: normalizeAppStoreUrl(a.appUrl)! }))
      .slice(0, maxApps);

    if (filtered.length > 0) {
      apps = filtered;
    }
  } catch (e) {
    console.error("[appstore-from-audience] LLM ranking failed, using SerpAPI fallback", e);
  }

  return Response.json({ apps });
}
