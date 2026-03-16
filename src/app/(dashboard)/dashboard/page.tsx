import Link from "next/link";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getOrganization } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import {
  CheckCircle2,
  Circle,
  Plus,
  Users,
  FlaskConical,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export default async function DashboardPage() {
  const { user, organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const orgDisplayName = activeOrg?.isPersonal
    ? "your personal workspace"
    : activeOrg?.name ?? "your workspace";

  const [org, personaGroupCount, studyCount, personaCount, recentStudies] =
    await Promise.all([
      getOrganization(activeOrgId),
      prisma.personaGroup.count({ where: { organizationId: activeOrgId } }),
      prisma.study.count({ where: { organizationId: activeOrgId } }),
      prisma.persona.count({
        where: { personaGroup: { organizationId: activeOrgId } },
      }),
      prisma.study.findMany({
        where: { organizationId: activeOrgId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          _count: { select: { sessions: true } },
        },
      }),
    ]);

  const steps = [
    { label: "Create workspace", done: true, href: null },
    {
      label: "Set up product context",
      done: !!org?.setupCompleted,
      href: "/settings",
    },
    {
      label: "Create a persona group",
      done: personaGroupCount > 0,
      href: "/personas/new",
    },
    {
      label: "Run your first study",
      done: studyCount > 0,
      href: "/studies/new",
    },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome back{user.name ? `, ${user.name}` : ""}
        </h2>
        <p className="text-muted-foreground">
          You&apos;re working in {orgDisplayName}.
        </p>
      </div>

      {/* Onboarding Checklist */}
      {!allDone && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <h3 className="font-medium">Get started with GoTofu</h3>
            <p className="text-sm text-muted-foreground">
              Complete these steps to get the most out of your workspace.
            </p>
          </div>
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                )}
                {step.href && !step.done ? (
                  <Link href={step.href} className="text-sm hover:underline">
                    {step.label}
                  </Link>
                ) : (
                  <span
                    className={`text-sm ${step.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {step.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/personas/new"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Persona Group
        </Link>
        <Link
          href="/studies/new"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Study
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Persona Groups"
          value={personaGroupCount}
          icon={Users}
          href="/personas"
        />
        <StatCard
          title="Total Personas"
          value={personaCount}
          icon={Users}
          href="/personas"
        />
        <StatCard
          title="Studies"
          value={studyCount}
          icon={FlaskConical}
          href="/studies"
        />
      </div>

      {/* Recent Studies */}
      {recentStudies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Recent Studies</h3>
            <Link
              href="/studies"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentStudies.map((study) => (
              <Link
                key={study.id}
                href={`/studies/${study.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {study.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {study._count.sessions} sessions
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${statusColors[study.status]}`}
                  >
                    {study.status.toLowerCase()}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  icon: typeof Users;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </Link>
  );
}
