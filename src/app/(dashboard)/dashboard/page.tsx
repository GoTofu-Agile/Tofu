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
import { CheckCircle2, Circle, Users, FlaskConical, Settings, BarChart3, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { user, activeOrgId } = await requireAuthWithActiveOrg();

  const [
    activeOrg,
    orgContext,
    personaGroupCount,
    studyCount,
    personaCount,
    completedStudyCount,
    recentStudies,
    recentGroups,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { name: true, isPersonal: true },
    }),
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

  const orgDisplayName = activeOrg?.isPersonal ? "Personal" : (activeOrg?.name ?? "Workspace");

  const steps = [
    {
      label: "Tell us what you’re building",
      why: "Product context makes personas and interview questions feel specific to you—not generic.",
      done: !!orgContext?.setupCompleted,
      href: "/settings",
      cta: "Add product context",
    },
    {
      label: "Create a persona group",
      why: "Groups define who you’ll interview—one audience per group works best to start.",
      done: personaGroupCount > 0,
      href: "/personas/new",
      cta: "Create personas",
    },
    {
      label: "Run your first study",
      why: "A study holds your guide, interviews, and the insight report in one place.",
      done: studyCount > 0,
      href: "/studies/new",
      cta: "Start a study",
    },
  ];
  const allDone = steps.every((s) => s.done);
  const completedStepCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  const isFirstTime = personaGroupCount === 0 && studyCount === 0 && !orgContext?.setupCompleted;
  const lastStudy = recentStudies[0];
  const primaryHref = nextStep?.href ?? (lastStudy ? `/studies/${lastStudy.id}` : "/studies/new");
  const primaryCta = nextStep?.cta ?? (lastStudy ? "Open latest study" : "Start a study");
  const showFlowHelp = isFirstTime;

  const motionHowItWorks = !isFirstTime ? 4 : 3;
  const motionRecent = !isFirstTime ? 5 : 4;
  const motionChecklist = !isFirstTime ? 6 : 5;

  return (
    <div className="space-y-10">
      {/* Hero — purpose + orientation */}
      <MotionStaggerSection index={0} className="space-y-3">
        <p className="ds-section-label tracking-widest">{orgDisplayName}</p>
        <h1 className="ds-page-title mt-1 max-w-3xl">
          {getGreeting()}, {user.name?.split(" ")[0] || "there"}
        </h1>
        <p className="ds-page-description mt-2 max-w-2xl text-[15px] leading-relaxed">
          {isFirstTime ? (
            <>
              <span className="font-medium text-foreground">GoTofu runs AI interviews with synthetic personas</span>
              {" "}so you get transcripts and themes—without recruiting. Follow the steps below; most teams finish setup in
              under 10 minutes.
            </>
          ) : (
            <>
              Pick up where you left off, or start a new study when you’re ready. Everything lives under{" "}
              <span className="font-medium text-foreground">Personas</span> and{" "}
              <span className="font-medium text-foreground">Studies</span> in the sidebar.
            </>
          )}
        </p>
      </MotionStaggerSection>

      {/* Primary action — impossible to miss */}
      <MotionStaggerSection index={1}>
        <section
          className={`rounded-2xl border p-6 md:p-8 ${
            allDone
              ? "border-border bg-card"
              : "border-foreground/15 bg-gradient-to-br from-card to-muted/40 shadow-[var(--shadow-card)]"
          }`}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {allDone ? "Ready when you are" : `Step ${completedStepCount + 1} of 3`}
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                {allDone
                  ? "Core setup is complete. Start a new study or open a recent one."
                  : nextStep
                    ? nextStep.label
                    : "Continue"}
              </h2>
              {!allDone && nextStep && (
                <p className="text-sm leading-relaxed text-muted-foreground">{nextStep.why}</p>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {primaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <DashboardTour orgId={activeOrgId} defaultOpen={isFirstTime} />
            </div>
          </div>
        </section>
      </MotionStaggerSection>

      {/* Snapshot — scannable, outcome-oriented labels */}
      <MotionStaggerSection index={2}>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Product context</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {orgContext?.setupCompleted ? "Added" : "Not yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Used to tailor personas & prompts</p>
            <Link
              href="/settings"
              className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {orgContext?.setupCompleted ? "Review in Settings" : "Add in Settings →"}
            </Link>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Persona groups</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{personaGroupCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{personaCount} personas total</p>
            <Link href="/personas" className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground">
              View personas
            </Link>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Studies</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{studyCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{completedStudyCount} completed</p>
            <Link href="/studies" className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground">
              View studies
            </Link>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Latest</p>
            <p className="mt-1 line-clamp-2 text-lg font-semibold leading-snug">
              {lastStudy ? lastStudy.title : "No studies yet"}
            </p>
            {lastStudy ? (
              <Link
                href={`/studies/${lastStudy.id}`}
                className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Open study →
              </Link>
            ) : (
              <Link
                href="/studies/new"
                className="mt-3 inline-flex text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Create a study →
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
          <div className="mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              How GoTofu works
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Four steps from setup to decisions—click any step to jump in.
            </p>
          </div>
          <TooltipProvider delay={100}>
            <div className="grid gap-3 md:grid-cols-4">
              <DashboardFlowCard
                href="/settings"
                icon={<Settings className="h-4 w-4 text-muted-foreground" />}
                title="1 · Context"
                description="What you’re building & who it’s for"
                tooltip="We use this to steer personas and interview questions—never to train public models without your say."
                showTooltip={showFlowHelp}
              />
              <DashboardFlowCard
                href="/personas/new"
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                title="2 · Personas"
                description="Synthetic participants for interviews"
                tooltip="Each group is an audience slice (e.g. job title, industry, or behavior)."
                showTooltip={showFlowHelp}
              />
              <DashboardFlowCard
                href="/studies/new"
                icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
                title="3 · Studies"
                description="Guide + interviews in one workspace"
                tooltip="You get sessions, transcripts, then an aggregated report."
                showTooltip={showFlowHelp}
              />
              <DashboardFlowCard
                href="/studies"
                icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                title="4 · Insights"
                description="Themes, quotes, and recommendations"
                tooltip="Open any completed study to generate or refresh insights."
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
              title="Recent studies"
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
              title="Recent persona groups"
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

      {/* Checklist — for returning users who still owe setup; hidden on first visit (tour + hero cover it) */}
      {!allDone && !isFirstTime && (
        <MotionStaggerSection index={motionChecklist}>
          <section className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Finish setup
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete what’s left so interviews and insights stay on-brand.
            </p>
            <div className="mt-4 space-y-2">
              {steps.map((step) => (
                <div key={step.label} className="flex items-start gap-3 rounded-lg p-2">
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30" />
                  )}
                  <div className="space-y-0.5">
                    {step.href && !step.done ? (
                      <Link href={step.href} className="text-sm font-medium hover:underline">
                        {step.label}
                      </Link>
                    ) : (
                      <span
                        className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}
                      >
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
