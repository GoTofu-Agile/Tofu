import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { serpGet, isSerpApiConfigured } from "@/lib/research/serpapi/client";
import { rowsFromAppleAppStoreSearchJson } from "@/lib/research/serpapi/parse-apple-app-store-search";

const requestSchema = z.object({
  groupId: z.string().min(1),
  prompt: z.string().min(3).max(400),
});

function isAppStoreUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.includes("apps.apple.com");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const dbUser = await getUser(authUser.id);
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 401 });

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const group = await getPersonaGroup(body.groupId);
  if (!group) return Response.json({ error: "Group not found" }, { status: 404 });

  const role = await getUserRole(group.organizationId, dbUser.id);
  if (!role) return Response.json({ error: "Access denied" }, { status: 403 });

  if (!isSerpApiConfigured()) {
    return Response.json({ appUrl: null, reason: "serp_disabled" });
  }

  try {
    const json = await serpGet({ engine: "apple_app_store", term: body.prompt });
    const rows = rowsFromAppleAppStoreSearchJson(json);
    const match = rows.find((r) => isAppStoreUrl(r.url))?.url ?? null;
    return Response.json({ appUrl: match });
  } catch (e) {
    console.error("[discover-appstore-url] SerpAPI search failed", e);
    return Response.json({ appUrl: null, reason: "search_failed" });
  }
}
