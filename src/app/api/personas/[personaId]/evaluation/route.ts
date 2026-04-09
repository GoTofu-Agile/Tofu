import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import { setPersonaEvaluationStatus } from "@/lib/personas/evaluation/repository";
import { runPersonaEvaluation } from "@/lib/personas/evaluation/pipeline";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ personaId: string }> }
) {
  const { personaId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const dbUser = await getUser(authUser.id);
  if (!dbUser) return Response.json({ error: "User not found" }, { status: 401 });

  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      personaGroup: { select: { organizationId: true } },
      evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 },
      claims: { orderBy: { createdAt: "desc" } },
      similarityMatches: { orderBy: { similarityScore: "desc" }, take: 5 },
    },
  });
  if (!persona) return Response.json({ error: "Persona not found" }, { status: 404 });

  const role = await getUserRole(persona.personaGroup.organizationId, dbUser.id);
  if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });

  let latestEvaluation = persona.evaluations[0] ?? null;
  let evaluationStatus = persona.evaluationStatus;
  let claims = persona.claims;
  let similarityMatches = persona.similarityMatches;
  let evaluationError = persona.evaluationError;
  const isStalePending =
    (evaluationStatus === "PENDING" || evaluationStatus === "RUNNING") &&
    Date.now() - new Date(persona.updatedAt).getTime() > 90 * 1000;

  if (isStalePending) {
    try {
      await runPersonaEvaluation(persona.id);
      const refreshed = await prisma.persona.findUnique({
        where: { id: persona.id },
        include: {
          evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 },
          claims: { orderBy: { createdAt: "desc" } },
          similarityMatches: { orderBy: { similarityScore: "desc" }, take: 5 },
        },
      });
      if (refreshed) {
        evaluationStatus = refreshed.evaluationStatus;
        latestEvaluation = refreshed.evaluations[0] ?? null;
        claims = refreshed.claims;
        similarityMatches = refreshed.similarityMatches;
        evaluationError = refreshed.evaluationError;
      }
    } catch (error) {
      await setPersonaEvaluationStatus(persona.id, "FAILED", {
        message: error instanceof Error ? error.message : "Evaluation failed",
        at: new Date().toISOString(),
        reason: "stale_pending_fallback_failed",
      });
      evaluationStatus = "FAILED";
      evaluationError = {
        message: error instanceof Error ? error.message : "Evaluation failed",
      };
    }
  }

  return Response.json({
    personaId: persona.id,
    evaluationStatus,
    latestEvaluation,
    claims,
    evidence: latestEvaluation?.evidence ?? null,
    similarityMatches,
    evaluationError,
  });
}
