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

      // Initial state — parallelise both queries
      const [initialCompleted, totalPersonas] = await Promise.all([
        prisma.session.count({ where: { studyId, status: "COMPLETED" } }),
        getTotalPersonas(studyId),
      ]);
      lastCompleted = initialCompleted;

      send("status", { completed: initialCompleted, total: totalPersonas });

      let closed = false;
      let timeoutId: ReturnType<typeof setTimeout>;
      let tickId: ReturnType<typeof setTimeout>;

      function close() {
        if (closed) return;
        closed = true;
        clearTimeout(timeoutId);
        clearTimeout(tickId);
        try { controller.close(); } catch { /* already closed */ }
      }

      // Adaptive polling: start at 2 s, slow to 5 s after 20 quiet ticks (~40 s)
      let quietTicks = 0;
      const BASE_INTERVAL = 2000;
      const SLOW_INTERVAL = 5000;
      const QUIET_THRESHOLD = 20;

      async function tick() {
        if (closed) return;
        try {
          // One round-trip: count + running session in parallel
          const [completed, running] = await Promise.all([
            prisma.session.count({ where: { studyId, status: "COMPLETED" } }),
            prisma.session.findFirst({
              where: { studyId, status: "RUNNING" },
              select: {
                id: true,
                personaId: true,
                persona: { select: { name: true } },
              },
              orderBy: { createdAt: "desc" },
            }),
          ]);

          const runningName = running?.persona?.name ?? null;

          if (running && runningName && runningName !== lastRunningPersona) {
            send("interview-start", {
              sessionId: running.id,
              personaId: running.personaId,
              personaName: runningName,
              completed,
              total: totalPersonas,
            });
            lastRunningPersona = runningName;
            quietTicks = 0;
          }

          if (completed > lastCompleted) {
            quietTicks = 0;
            // Only fetch last-completed details when the count actually moved
            const lastSession = await prisma.session.findFirst({
              where: { studyId, status: "COMPLETED" },
              orderBy: { completedAt: "desc" },
              select: {
                id: true,
                personaId: true,
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
                sessionId: lastSession.id,
                personaId: lastSession.personaId,
                personaName: lastSession.persona?.name,
                completed,
                total: totalPersonas,
                quote,
              });
            }

            lastCompleted = completed;

            if (completed >= totalPersonas && totalPersonas > 0) {
              send("all-done", { completed, total: totalPersonas });
              close();
              return;
            }
          } else {
            quietTicks++;
          }
        } catch {
          // Ignore transient errors, keep polling
        }

        if (!closed) {
          const delay = quietTicks >= QUIET_THRESHOLD ? SLOW_INTERVAL : BASE_INTERVAL;
          tickId = setTimeout(tick, delay);
        }
      }

      // Kick off first tick
      tickId = setTimeout(tick, BASE_INTERVAL);

      // Hard timeout after 10 minutes
      timeoutId = setTimeout(close, 600_000);

      // Handle client disconnect
      request.signal.addEventListener("abort", close);
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
