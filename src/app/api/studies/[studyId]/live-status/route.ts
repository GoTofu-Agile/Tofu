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

  // Auth check
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

  // Verify study access
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: { organizationId: true },
  });
  if (!study) {
    return Response.json({ error: "Study not found" }, { status: 404 });
  }
  const role = await getUserRole(study.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      let lastCompleted = 0;
      let lastRunningPersona: string | null = null;

      // Initial state
      const initialCompleted = await prisma.session.count({
        where: { studyId, status: "COMPLETED" },
      });
      lastCompleted = initialCompleted;

      const totalPersonas = await getTotalPersonas(studyId);

      send("status", {
        completed: initialCompleted,
        total: totalPersonas,
      });

      // Poll every 2s
      const interval = setInterval(async () => {
        try {
          // Count completed sessions
          const completed = await prisma.session.count({
            where: { studyId, status: "COMPLETED" },
          });

          // Find running session
          const running = await prisma.session.findFirst({
            where: { studyId, status: "RUNNING" },
            select: {
              persona: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
          });

          const runningName = running?.persona?.name ?? null;

          // Emit interview-start when a new persona starts
          if (runningName && runningName !== lastRunningPersona) {
            send("interview-start", {
              personaName: runningName,
              completed,
              total: totalPersonas,
            });
            lastRunningPersona = runningName;
          }

          // Emit interview-complete when count increases
          if (completed > lastCompleted) {
            // Get the most recently completed session's persona + last quote
            const lastSession = await prisma.session.findFirst({
              where: { studyId, status: "COMPLETED" },
              orderBy: { completedAt: "desc" },
              select: {
                persona: { select: { name: true } },
                messages: {
                  where: { role: "RESPONDENT" },
                  orderBy: { sequence: "desc" },
                  take: 1,
                  select: { content: true },
                },
              },
            });

            if (lastSession) {
              const quote = lastSession.messages[0]?.content?.slice(0, 100) ?? null;
              send("interview-complete", {
                personaName: lastSession.persona?.name,
                completed,
                total: totalPersonas,
                quote,
              });
            }

            lastCompleted = completed;

            // Check if all done
            if (completed >= totalPersonas && totalPersonas > 0) {
              send("all-done", { completed, total: totalPersonas });
              clearInterval(interval);
              controller.close();
              return;
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 2000);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, 600000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function getTotalPersonas(studyId: string): Promise<number> {
  const groups = await prisma.studyPersonaGroup.findMany({
    where: { studyId },
    select: {
      personaGroup: {
        select: {
          _count: { select: { personas: { where: { isActive: true } } } },
        },
      },
    },
  });
  return groups.reduce((sum, g) => sum + g.personaGroup._count.personas, 0);
}
