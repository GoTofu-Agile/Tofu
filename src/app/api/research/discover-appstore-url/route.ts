import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { searchTavily } from "@/lib/research/tavily";

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

  if (!process.env.TAVILY_API_KEY) {
    return Response.json({ appUrl: null, reason: "tavily_disabled" });
  }

  const query = `${body.prompt} app iPhone site:apps.apple.com`;
  const results = await searchTavily(query, { maxResults: 8, searchDepth: "basic" });
  const match = results.find((r) => isAppStoreUrl(r.url))?.url ?? null;

  return Response.json({ appUrl: match });
}

