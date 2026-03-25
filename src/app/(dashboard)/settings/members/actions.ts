"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import {
  getUserRole,
  createInvitation,
  removeMember,
  updateMemberRole,
  revokeInvitation,
} from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";

async function getActiveOrgWithRole() {
  const user = await requireAuth();
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) return { error: "No active organization" as const };

  // Block member actions on personal workspaces
  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: { isPersonal: true },
  });
  if (org?.isPersonal) {
    return { error: "Cannot manage members in a personal workspace. Create a team workspace instead." as const };
  }

  const role = await getUserRole(activeOrgId, user.id);
  if (role !== "OWNER" && role !== "ADMIN") {
    return { error: "Insufficient permissions" as const };
  }

  return { user, activeOrgId, role };
}

export async function createInviteLink(email: string, role: "ADMIN" | "MEMBER" | "VIEWER") {
  const ctx = await getActiveOrgWithRole();
  if ("error" in ctx) return { error: ctx.error };

  const invitation = await createInvitation(ctx.activeOrgId, email || "invite@placeholder.local", role);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return { inviteUrl: `${origin}/accept-invite/${invitation.token}` };
}

export async function kickMember(memberUserId: string) {
  const ctx = await getActiveOrgWithRole();
  if ("error" in ctx) return { error: ctx.error };

  if (memberUserId === ctx.user.id) {
    return { error: "You cannot remove yourself" };
  }

  await removeMember(ctx.activeOrgId, memberUserId);
  revalidatePath("/settings/members");
  return { success: true };
}

export async function changeMemberRole(memberUserId: string, role: "ADMIN" | "MEMBER" | "VIEWER") {
  const ctx = await getActiveOrgWithRole();
  if ("error" in ctx) return { error: ctx.error };

  await updateMemberRole(ctx.activeOrgId, memberUserId, role);
  revalidatePath("/settings/members");
  return { success: true };
}

export async function revokeInvite(invitationId: string) {
  const ctx = await getActiveOrgWithRole();
  if ("error" in ctx) return { error: ctx.error };

  await revokeInvitation(invitationId);
  revalidatePath("/settings/members");
  return { success: true };
}
