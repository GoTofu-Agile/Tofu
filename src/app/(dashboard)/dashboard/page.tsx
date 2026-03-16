import Link from "next/link";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getOrganization } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import { CheckCircle2, Circle } from "lucide-react";

export default async function DashboardPage() {
  const { user, organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const [org, personaGroupCount, studyCount, personaCount] = await Promise.all([
    getOrganization(activeOrgId),
    prisma.personaGroup.count({ where: { organizationId: activeOrgId } }),
    prisma.study.count({ where: { organizationId: activeOrgId } }),
    prisma.persona.count({
      where: { personaGroup: { organizationId: activeOrgId } },
    }),
  ]);

  const steps = [
    { label: "Create workspace", done: true, href: null },
    { label: "Set up product context", done: !!org?.setupCompleted, href: "/settings" },
    { label: "Create a persona group", done: personaGroupCount > 0, href: "/personas/new" },
    { label: "Run your first study", done: studyCount > 0, href: "/studies/new" },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome back{user.name ? `, ${user.name}` : ""}
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      {/* Onboarding Checklist */}
      {!allDone && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <h3 className="font-medium">Get started with GoTofu</h3>
            <p className="text-sm text-muted-foreground">Complete these steps to get the most out of your workspace.</p>
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
                  <span className={`text-sm ${step.done ? "text-muted-foreground line-through" : ""}`}>
                    {step.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Persona Groups" value={personaGroupCount} />
        <StatCard title="Total Personas" value={personaCount} />
        <StatCard title="Studies" value={studyCount} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
