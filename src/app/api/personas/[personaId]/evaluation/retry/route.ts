import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { inngest } from "@/lib/inngest/client";
import { personaRetryEvaluationSchema } from "@/lib/validation/schemas";
import { runPersonaEvaluation } from "@/lib/personas/evaluation/pipeline";
import { setPersonaEvaluationStatus } from "@/lib/personas/evaluation/repository";

export async function POST(
  request: NextRequest,
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

  const rawBody = await request.json().catch(() => ({}));
  const parsed = personaRetryEvaluationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    include: { personaGroup: { select: { organizationId: true } } },
  });
  if (!persona) return Response.json({ error: "Persona not found" }, { status: 404 });

  const role = await getUserRole(persona.personaGroup.organizationId, dbUser.id);
  if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });

  if (!parsed.data.force && persona.evaluationStatus === "RUNNING") {
    return Response.json({ error: "Evaluation already running" }, { status: 409 });
  }

  await prisma.persona.update({
    where: { id: persona.id },
    data: {
      evaluationStatus: "PENDING",
      evaluationVersion: { increment: 1 },
      evaluationError: Prisma.JsonNull,
    },
  });

  // For explicit retries, run evaluation immediately in-process so users get a deterministic result
  // even when background workers are unavailable in the current environment.
  if (parsed.data.force) {
    try {
      await runPersonaEvaluation(persona.id);
      const latest = await prisma.personaEvaluation.findFirst({
        where: { personaId: persona.id },
        orderBy: { evaluatedAt: "desc" },
        select: {
          trustScore: true,
          confidenceLabel: true,
          summary: true,
        },
      });
      return Response.json({
        ok: true,
        evaluationStatus: "COMPLETED",
        trustScore: latest?.trustScore ?? null,
        confidenceLabel: latest?.confidenceLabel ?? null,
        summary: latest?.summary ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Evaluation failed";
      await setPersonaEvaluationStatus(persona.id, "FAILED", {
        message,
        at: new Date().toISOString(),
        reason: "retry_immediate_failed",
      });
      return Response.json(
        { ok: false, evaluationStatus: "FAILED", error: message },
        { status: 500 }
      );
    }
  }

  await inngest.send({
    name: "persona/evaluate.requested",
    data: { personaId: persona.id, forced: parsed.data.force },
  });

  return Response.json({ ok: true, evaluationStatus: "PENDING" });
}
