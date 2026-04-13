import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPersonaGenerationRun } from "@/lib/server/persona-generation-tracker";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return Response.json({ error: "Missing runId" }, { status: 400 });
  }

  const run = await getPersonaGenerationRun(runId);
  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }
  if (run.userId !== authUser.id) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  return Response.json(run);
}
