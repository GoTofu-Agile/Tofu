import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { generateAndSavePersonas } from "@/lib/ai/generate-personas";

const requestSchema = z.object({
  groupId: z.string().min(1),
  count: z.number().int().min(1).max(20).default(5),
});

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

  let body;
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

  try {
    const result = await generateAndSavePersonas({
      groupId: body.groupId,
      count: body.count,
      domainContext: group.domainContext ?? undefined,
    });

    return Response.json({
      generated: result.generated,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[personas/expand-group] Generation failed:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
