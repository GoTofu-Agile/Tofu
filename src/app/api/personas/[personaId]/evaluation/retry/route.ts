import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { inngest } from "@/lib/inngest/client";
import { personaRetryEvaluationSchema } from "@/lib/validation/schemas";

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

  await inngest.send({
    name: "persona/evaluate.requested",
    data: { personaId: persona.id, forced: parsed.data.force },
  });

  return Response.json({ ok: true, evaluationStatus: "PENDING" });
}
