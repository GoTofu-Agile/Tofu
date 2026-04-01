import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { resolveActiveOrganizationId } from "@/lib/auth";
import { cookies } from "next/headers";
import { getPersonaCreationContext } from "@/lib/personas/persona-creation-context";

export async function GET() {
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

  const cookieStore = await cookies();
  const activeOrgId = await resolveActiveOrganizationId(
    cookieStore.get("activeOrgId")?.value,
    dbUser.id
  );
  if (!activeOrgId) {
    return Response.json({ error: "No organization" }, { status: 403 });
  }

  const ctx = await getPersonaCreationContext(activeOrgId);
  return Response.json(ctx);
}
