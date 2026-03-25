import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getConversationsForUser } from "@/lib/db/queries/chat";

export async function GET() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const dbUser = await getUser(authUser.id);
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 401 });

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) return Response.json({ conversations: [] });

  const conversations = await getConversationsForUser(dbUser.id, activeOrgId);
  return Response.json({ conversations });
}
