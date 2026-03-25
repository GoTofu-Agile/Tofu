import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const { studyId } = await params;

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

  // Lightweight query: only counts + running session name
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: {
      organizationId: true,
      personaGroups: {
        select: {
          personaGroup: {
            select: {
              _count: { select: { personas: { where: { isActive: true } } } },
            },
          },
        },
      },
      _count: {
        select: {
          sessions: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  if (!study) {
    return Response.json({ error: "Study not found" }, { status: 404 });
  }

  const role = await getUserRole(study.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  // Find currently running session (separate lightweight query)
  const [running, reportCount] = await Promise.all([
    prisma.session.findFirst({
      where: { studyId, status: "RUNNING" },
      select: { persona: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.analysisReport.count({ where: { studyId } }),
  ]);

  const totalPersonas = study.personaGroups.reduce(
    (sum, spg) => sum + spg.personaGroup._count.personas,
    0
  );
  const completed = study._count.sessions;

  return Response.json({
    total: totalPersonas,
    completed,
    running: running ? { personaName: running.persona?.name } : null,
    done: completed >= totalPersonas && totalPersonas > 0,
    hasReport: reportCount > 0,
    reportCount,
  });
}
