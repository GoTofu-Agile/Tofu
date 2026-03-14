import { cookies } from "next/headers";
import Link from "next/link";
import { requireAuthWithOrgs } from "@/lib/auth";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { CreateGroupDialog } from "@/components/personas/create-group-dialog";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default async function PersonasPage() {
  const { organizations } = await requireAuthWithOrgs();

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("activeOrgId")?.value;
  const activeOrgId =
    organizations.find((org) => org.id === cookieOrgId)?.id ??
    organizations[0]?.id;

  const groups = await getPersonaGroupsForOrg(activeOrgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Personas</h2>
          <p className="text-muted-foreground">
            Manage your persona groups and individual personas.
          </p>
        </div>
        <CreateGroupDialog />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No persona groups yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first persona group to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/personas/${group.id}`}
              className="group rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium group-hover:underline">
                  {group.name}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {group.sourceType.replace("_", " ").toLowerCase()}
                </Badge>
              </div>
              {group.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {group.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{group._count.personas} personas</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
