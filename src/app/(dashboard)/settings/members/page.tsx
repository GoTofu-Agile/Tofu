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
