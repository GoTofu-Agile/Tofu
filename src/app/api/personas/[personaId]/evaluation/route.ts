import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";

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

  const latestEvaluation = persona.evaluations[0] ?? null;
  return Response.json({
    personaId: persona.id,
    evaluationStatus: persona.evaluationStatus,
    latestEvaluation,
    claims: persona.claims,
    evidence: latestEvaluation?.evidence ?? null,
    similarityMatches: persona.similarityMatches,
    evaluationError: persona.evaluationError,
  });
}
