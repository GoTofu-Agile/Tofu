import { redirect } from "next/navigation";
import { requireAuthWithOrgs } from "@/lib/auth";
import { getAllOrganizations, getPendingInvitations, getOrganization } from "@/lib/db/queries/organizations";
import { CreateOrgForm } from "./create-org-form";
import { OrgInviteGenerator } from "./org-invite-generator";
import { CopyInviteButton } from "./copy-invite-button";
import { Building2, Users, BookOpen } from "lucide-react";

export default async function AdminPage() {
  const { user } = await requireAuthWithOrgs();

  const adminEmails = (process.env.GOTOFU_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email)) {
    redirect("/dashboard");
  }

  const orgs = await getAllOrganizations();

  // Load pending invitations for each non-personal org
  const nonPersonalOrgs = orgs.filter((o) => !o.isPersonal);
  const invitationsPerOrg = await Promise.all(
    nonPersonalOrgs.map((o) => getPendingInvitations(o.id))
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">GoTofu Admin</h2>
        <p className="text-muted-foreground">
          Manage customer workspaces and onboarding.
        </p>
      </div>

      {/* Create org */}
      <div className="rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Create workspace for customer</h3>
        <p className="text-sm text-muted-foreground">
          Creates a new workspace and generates an admin invite link for the founder.
        </p>
        <CreateOrgForm />
      </div>

      {/* Org list */}
      <div className="space-y-3">
        <h3 className="font-medium">
          All workspaces ({nonPersonalOrgs.length} team{nonPersonalOrgs.length !== 1 ? "s" : ""}, {orgs.filter(o => o.isPersonal).length} personal)
        </h3>

        <div className="space-y-3">
          {nonPersonalOrgs.map((org, i) => {
            const pending = invitationsPerOrg[i];
            return (
              <div key={org.id} className="rounded-lg border p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium">{org.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{org.id}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {org._count.members} members
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {org._count.studies} studies
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {org._count.personaGroups} groups
                    </span>
                  </div>
                </div>

                {/* Pending invitations */}
                {pending.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Pending invites</p>
                    {pending.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{inv.email === "invite@placeholder.local" ? "(no email)" : inv.email}</span>
                        <span className="rounded px-1 py-0.5 bg-muted">{inv.role.toLowerCase()}</span>
                        <CopyInviteButton token={inv.token} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Generate new invite */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Generate invite link</p>
                  <OrgInviteGenerator orgId={org.id} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
