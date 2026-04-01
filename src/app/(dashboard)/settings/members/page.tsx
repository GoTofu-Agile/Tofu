import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getOrganization, getPendingInvitations, getUserRole } from "@/lib/db/queries/organizations";
import { notFound } from "next/navigation";
import { InviteForm } from "./invite-form";
import { MemberRow } from "./member-row";
import { InvitationRow } from "./invitation-row";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Building2 } from "lucide-react";

export default async function MembersPage() {
  const { user, activeOrgId } = await requireAuthWithActiveOrg();

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
        <PageHeader
          title="Members"
          description="This is your personal workspace for testing and exploration."
        />
        <EmptyState
          icon={Building2}
          title="Personal workspace"
          description="To collaborate with your team, create a team workspace. Team workspaces let you invite members, assign roles, and share personas and studies."
        >
          <Link href="/settings?new=true" className={buttonVariants({ variant: "default" })}>
            Create team workspace
          </Link>
        </EmptyState>
      </div>
    );
  }

  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  return (
    <div className="space-y-8">
      <PageHeader title="Members" description="Manage your workspace members and invitations." />

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
