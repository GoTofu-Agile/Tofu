import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getOrganization, getPendingInvitations, getUserRole } from "@/lib/db/queries/organizations";
import { notFound } from "next/navigation";
import { InviteForm } from "./invite-form";
import { MemberRow } from "./member-row";
import { InvitationRow } from "./invitation-row";

export default async function MembersPage() {
  const { user, organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const [org, pendingInvitations, myRole] = await Promise.all([
    getOrganization(activeOrgId),
    getPendingInvitations(activeOrgId),
    getUserRole(activeOrgId, user.id),
  ]);

  if (!org) notFound();

  // Personal workspace — no members
  if (org.isPersonal) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
          <p className="text-muted-foreground">
            This is your personal workspace for testing and exploration.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">Personal workspace</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            To collaborate with your team, create a team workspace. Team
            workspaces let you invite members, assign roles, and share personas
            and studies.
          </p>
          <a
            href="/settings?new=true"
            className="mt-4 inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Create team workspace
          </a>
        </div>
      </div>
    );
  }

  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
        <p className="text-muted-foreground">
          Manage your workspace members and invitations.
        </p>
      </div>

      {/* Invite Form */}
      {canManage && (
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="text-sm font-medium">Invite someone</h3>
          <InviteForm />
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Members ({org.members.length})
        </h3>
        <div className="rounded-lg border divide-y">
          {org.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={user.id}
              canManage={canManage}
            />
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Pending Invitations ({pendingInvitations.length})
          </h3>
          <div className="rounded-lg border divide-y">
            {pendingInvitations.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                canManage={canManage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
