import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getConversation } from "@/lib/db/queries/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const dbUser = await getUser(authUser.id);
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 401 });

  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.userId !== dbUser.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ messages: conversation.messages });
}
