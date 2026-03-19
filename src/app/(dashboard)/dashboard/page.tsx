import Link from "next/link";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import {
  CheckCircle2,
  Circle,
  Users,
  FlaskConical,
  MessageSquare,
  Settings,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { user, organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const orgDisplayName = activeOrg?.isPersonal ? "Personal" : (activeOrg?.name ?? "Workspace");

  const [orgContext, personaGroupCount, studyCount, personaCount, recentStudies, recentGroups] =
    await Promise.all([
      getOrgProductContext(activeOrgId),
      prisma.personaGroup.count({ where: { organizationId: activeOrgId } }),
      prisma.study.count({ where: { organizationId: activeOrgId } }),
      prisma.persona.count({
        where: { personaGroup: { organizationId: activeOrgId } },
      }),
      prisma.study.findMany({
        where: { organizationId: activeOrgId },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { _count: { select: { sessions: true } } },
      }),
      prisma.personaGroup.findMany({
        where: { organizationId: activeOrgId },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { _count: { select: { personas: true } } },
      }),
    ]);

  const steps = [
    { label: "Set up product context", done: !!orgContext?.setupCompleted, href: "/settings" },
    { label: "Create a persona group", done: personaGroupCount > 0, href: "/personas/new" },
    { label: "Run your first study", done: studyCount > 0, href: "/studies/new" },
  ];
  const allDone = steps.every((s) => s.done);

  const featureCards = [
    {
      title: "Create Personas",
      description: "Generate realistic user profiles",
      icon: Users,
      href: "/personas/new",
      color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    },
    {
      title: "New Study",
      description: "Set up interviews with AI",
      icon: FlaskConical,
      href: "/studies/new",
      color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    },
    {
      title: "Product Context",
      description: "Describe your product for better results",
      icon: Settings,
      href: "/settings",
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    },
    {
      title: "Ask AI",
      description: "Get help from the assistant",
      icon: Sparkles,
      href: "#",
      color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
      isChat: true,
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header — ElevenLabs style */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {orgDisplayName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {getGreeting()}, {user.name?.split(" ")[0] || "there"}
        </h1>
      </div>

      {/* Feature Cards — horizontal row like ElevenLabs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {featureCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className={`inline-flex rounded-xl p-2.5 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold">{card.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {card.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Two-column: Recent Studies + Persona Groups */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Studies */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Studies
            </h2>
            {recentStudies.length > 0 && (
              <Link
                href="/studies"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {recentStudies.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
              <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No studies yet</p>
              <Link
                href="/studies/new"
                className="mt-2 inline-block text-xs text-foreground hover:underline"
              >
                Create your first study
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentStudies.map((study) => (
                <Link
                  key={study.id}
                  href={`/studies/${study.id}`}
                  className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{study.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {study._count.sessions} sessions
                    </span>
                    <Badge variant="secondary" className={`text-[10px] ${statusColors[study.status]}`}>
                      {study.status.toLowerCase()}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Persona Groups */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Your Personas
            </h2>
            {recentGroups.length > 0 && (
              <Link
                href="/personas"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {recentGroups.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No persona groups yet</p>
              <Link
                href="/personas/new"
                className="mt-2 inline-block text-xs text-foreground hover:underline"
              >
                Create your first personas
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/personas/${group.id}`}
                  className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{group.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {group._count.personas} personas
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding — subtle, only if not done */}
      {!allDone && (
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Getting Started
          </h3>
          <div className="mt-3 space-y-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                )}
                {step.href && !step.done ? (
                  <Link href={step.href} className="text-sm hover:underline">
                    {step.label}
                  </Link>
                ) : (
                  <span className={`text-sm ${step.done ? "text-muted-foreground line-through" : ""}`}>
                    {step.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
