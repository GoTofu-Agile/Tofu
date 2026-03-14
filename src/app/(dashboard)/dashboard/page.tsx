import { cookies } from "next/headers";
import { requireAuthWithOrgs } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardPage() {
  const { user, organizations } = await requireAuthWithOrgs();

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("activeOrgId")?.value;
  const activeOrgId =
    organizations.find((org) => org.id === cookieOrgId)?.id ??
    organizations[0]?.id;

  const [personaGroupCount, studyCount, personaCount] = await Promise.all([
    prisma.personaGroup.count({ where: { organizationId: activeOrgId } }),
    prisma.study.count({ where: { organizationId: activeOrgId } }),
    prisma.persona.count({
      where: { personaGroup: { organizationId: activeOrgId } },
    }),
  ]);

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Persona Groups" value={personaGroupCount} />
        <StatCard title="Total Personas" value={personaCount} />
        <StatCard title="Studies" value={studyCount} />
      </div>

      {personaGroupCount === 0 && studyCount === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">Get started</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first persona group to begin running synthetic user
            interviews.
          </p>
        </div>
      )}
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
