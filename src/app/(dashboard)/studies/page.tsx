import Link from "next/link";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getStudiesForOrg } from "@/lib/db/queries/studies";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, MessageSquare, CheckCircle2, Clock } from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  INTERVIEW: "Interview",
  SURVEY: "Survey",
  FOCUS_GROUP: "Focus Group",
  USABILITY_TEST: "Usability Test",
  CARD_SORT: "Card Sort",
};

export default async function StudiesPage() {
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const studies = await getStudiesForOrg(activeOrgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Studies</h2>
          <p className="text-muted-foreground">
            Run interviews with your synthetic personas to gather insights.
          </p>
        </div>
        <Link
          href="/studies/new"
          className="inline-flex items-center rounded-lg bg-primary px-3 h-9 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Study
        </Link>
      </div>

      {studies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No studies yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a study and start interviewing your synthetic personas.
          </p>
          <Link
            href="/studies/new"
            className="mt-4 inline-flex items-center rounded-lg border px-3 h-9 text-sm font-medium hover:bg-muted transition-colors"
          >
            Create your first study
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => (
            <Link
              key={study.id}
              href={`/studies/${study.id}`}
              className="group rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium group-hover:underline line-clamp-1">
                  {study.title}
                </h3>
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-[10px] ${statusColors[study.status]}`}
                >
                  {study.status.toLowerCase()}
                </Badge>
              </div>
              {study.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {study.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  {typeLabels[study.studyType] || study.studyType}
                </Badge>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {study._count.sessions} sessions
                </span>
                {study.completedCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {study.completedCount} done
                  </span>
                )}
                {study.status === "ACTIVE" && study.completedCount === 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-3 w-3" />
                    running
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {study.personaGroups.map((pg) => pg.personaGroup.name).join(", ")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
