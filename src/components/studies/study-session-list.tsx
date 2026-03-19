import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock } from "lucide-react";

interface Session {
  id: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  persona: {
    name: string;
    archetype: string | null;
  };
  _count: { messages: number };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  RUNNING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function StudySessionList({
  sessions,
  studyId,
}: {
  sessions: Session[];
  studyId: string;
}) {
  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={`/studies/${studyId}/${session.id}`}
          className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:border-foreground/20 hover:bg-muted/30"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{session.persona.name}</p>
              <Badge
                variant="secondary"
                className={`text-[10px] ${statusColors[session.status]}`}
              >
                {session.status.toLowerCase()}
              </Badge>
            </div>
            {session.persona.archetype && (
              <p className="text-xs text-muted-foreground">
                {session.persona.archetype}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {session._count.messages}
            </span>
            {session.durationMs && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(session.durationMs)}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
