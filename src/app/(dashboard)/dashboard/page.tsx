import Link from "next/link";
import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import { FeatureCards } from "@/components/dashboard/feature-cards";
import {
  DashboardRecentPersonasBlock,
  DashboardRecentSectionHeader,
  DashboardRecentStudiesBlock,
} from "@/components/dashboard/dashboard-recent-lists";
import { MotionStaggerSection } from "@/components/motion/page-motion";
import { DashboardTour } from "@/components/dashboard/dashboard-tour";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardFlowCard } from "@/components/dashboard/dashboard-flow-card";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Users,
  FlaskConical,
  Settings,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { user, activeOrgId } = await requireAuthWithActiveOrg();

  const activeOrg = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: { name: true, isPersonal: true },
  });
  const orgDisplayName = activeOrg?.isPersonal ? "Personal" : (activeOrg?.name ?? "Workspace");

  const [orgContext, personaGroupCount, studyCount, personaCount, completedStudyCount, recentStudies, recentGroups] =
    await Promise.all([
      getOrgProductContext(activeOrgId),
      prisma.personaGroup.count({ where: { organizationId: activeOrgId } }),
      prisma.study.count({ where: { organizationId: activeOrgId } }),
      prisma.persona.count({
        where: {
          personaGroup: { organizationId: activeOrgId },
        },
      }),
      prisma.study.count({
        where: { organizationId: activeOrgId, status: "COMPLETED" },
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
    {
      label: "Set up product context",
      why: "Improves relevance in personas and insights",
      done: !!orgContext?.setupCompleted,
      href: "/settings",
    },
    {
      label: "Create a persona group",
      why: "Gives studies participants to interview",
      done: personaGroupCount > 0,
      href: "/personas/new",
    },
    {
      label: "Run your first study",
      why: "Produces transcripts and insight reports",
      done: studyCount > 0,
      href: "/studies/new",
    },
  ];
  const allDone = steps.every((s) => s.done);
  const completedStepCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  const isFirstTime = personaGroupCount === 0 && studyCount === 0 && !orgContext?.setupCompleted;
  const lastStudy = recentStudies[0];
  const primaryHref = nextStep?.href ?? (lastStudy ? `/studies/${lastStudy.id}` : "/studies/new");
  const primaryLabel = nextStep ? `Start: ${nextStep.label}` : "Open latest study";
  const showFlowHelp = isFirstTime;

  const motionHowItWorks = !isFirstTime ? 4 : 3;
  const motionRecent = !isFirstTime ? 5 : 4;
  const motionChecklist = !isFirstTime ? 6 : 5;

  return (
    <div className="space-y-8">
      <MotionStaggerSection index={0} className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {orgDisplayName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {getGreeting()}, {user.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {isFirstTime
            ? "Start here: define context, create personas, then run your first study."
            : "Track progress, resume work, and move to your next insight faster."}
        </p>
      </MotionStaggerSection>

      <MotionStaggerSection index={1}>
      <section className="rounded-2xl border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Current state</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {allDone
                ? "Core setup is complete."
                : `${completedStepCount}/3 setup steps complete.`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {nextStep ? `Next recommended step: ${nextStep.label}.` : "You can now iterate with new studies."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <Sparkles className="h-4 w-4" />
              {primaryLabel}
            </Link>
            <DashboardTour orgId={activeOrgId} defaultOpen={isFirstTime} />
          </div>
        </div>
      </section>
      </MotionStaggerSection>

      <MotionStaggerSection index={2}>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Product context</p>
          <p className="mt-1 text-lg font-semibold">
            {orgContext?.setupCompleted ? "Configured" : "Missing"}
          </p>
          <Link href="/settings" className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground">
            Open settings
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Persona groups</p>
          <p className="mt-1 text-lg font-semibold">{personaGroupCount}</p>
          <p className="text-xs text-muted-foreground">{personaCount} total personas</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Studies</p>
          <p className="mt-1 text-lg font-semibold">{studyCount}</p>
          <p className="text-xs text-muted-foreground">{completedStudyCount} completed</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Latest activity</p>
          <p className="mt-1 text-lg font-semibold truncate">
            {lastStudy ? lastStudy.title : "No studies yet"}
          </p>
          {lastStudy ? (
            <Link
              href={`/studies/${lastStudy.id}`}
              className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Resume
            </Link>
          ) : (
            <Link
              href="/studies/new"
              className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Create study
            </Link>
          )}
        </div>
      </section>
      </MotionStaggerSection>

      {!isFirstTime && (
        <MotionStaggerSection index={3}>
          <FeatureCards />
        </MotionStaggerSection>
      )}

      <MotionStaggerSection index={motionHowItWorks}>
      <section className="rounded-2xl border bg-card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              How It Works
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow this flow to move from setup to decisions.
            </p>
          </div>
        </div>
        <TooltipProvider delay={100}>
          <div className="grid gap-3 md:grid-cols-4">
            <DashboardFlowCard
              href="/settings"
              icon={<Settings className="h-4 w-4 text-muted-foreground" />}
              title="Context"
              description="Your product + audience"
              tooltip="Used to tailor personas and interview prompts."
              showTooltip={showFlowHelp}
            />
            <DashboardFlowCard
              href="/personas/new"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              title="Personas"
              description="Build audiences"
              tooltip="The people your studies will interview."
              showTooltip={showFlowHelp}
            />
            <DashboardFlowCard
              href="/studies/new"
              icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
              title="Studies"
              description="Run interviews"
              tooltip="Creates sessions and transcripts for analysis."
              showTooltip={showFlowHelp}
            />
            <DashboardFlowCard
              href="/studies"
              icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
              title="Insights"
              description="Turn transcripts into themes"
              tooltip="Summarizes patterns, sentiment, and recommendations."
              showTooltip={showFlowHelp}
            />
          </div>
        </TooltipProvider>
      </section>
      </MotionStaggerSection>

      <MotionStaggerSection index={motionRecent}>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <DashboardRecentSectionHeader
            title="Recent Studies"
            href="/studies"
            showViewAll={recentStudies.length > 0}
          />
          <DashboardRecentStudiesBlock
            studies={recentStudies.map((s) => ({
              id: s.id,
              title: s.title,
              status: s.status,
              sessions: s._count.sessions,
            }))}
          />
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <DashboardRecentSectionHeader
            title="Your Personas"
            href="/personas"
            showViewAll={recentGroups.length > 0}
          />
          <DashboardRecentPersonasBlock
            groups={recentGroups.map((g) => ({
              id: g.id,
              name: g.name,
              personaCount: g._count.personas,
            }))}
          />
        </section>
      </div>
      </MotionStaggerSection>

      {/* Onboarding checklist */}
      {!allDone && (
        <MotionStaggerSection index={motionChecklist}>
        <section className="rounded-2xl border bg-card p-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Launch checklist
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete these once. They unlock the full dashboard workflow.
          </p>
          <div className="mt-3 space-y-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-start gap-3 rounded-lg p-2">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30" />
                )}
                <div className="space-y-0.5">
                  {step.href && !step.done ? (
                    <Link href={step.href} className="text-sm font-medium hover:underline">
                      {step.label}
                    </Link>
                  ) : (
                    <span className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                      {step.label}
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground">{step.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        </MotionStaggerSection>
      )}
    </div>
  );
}
