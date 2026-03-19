import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getStudy } from "@/lib/db/queries/studies";
import { getUserRole } from "@/lib/db/queries/organizations";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const { studyId } = await params;

  // Auth
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

  // Load study and verify access
  const study = await getStudy(studyId);
  if (!study) {
    return Response.json({ error: "Study not found" }, { status: 404 });
  }
  const role = await getUserRole(study.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  // Count personas that need interviews
  const existingPersonaIds = new Set(study.sessions.map((s) => s.personaId));
  const allPersonas = study.personaGroups.flatMap(
    (spg) => spg.personaGroup.personas
  );
  const pendingCount = allPersonas.filter(
    (p) => !existingPersonaIds.has(p.id)
  ).length;

  if (pendingCount === 0) {
    return Response.json({
      error: "All personas already have sessions",
    }, { status: 400 });
  }

  // Send event to Inngest
  try {
    await inngest.send({
      name: "study/run-batch",
      data: { studyId },
    });
  } catch (error) {
    console.error("[run-batch] Failed to send Inngest event:", error);
    const message = error instanceof Error ? error.message : "Failed to start batch interviews";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({
    success: true,
    message: `Batch interview started for ${pendingCount} personas`,
    pendingCount,
  });
}
