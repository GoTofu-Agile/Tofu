"use server";

import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth";
import {
  createOrganization,
  createInvitation,
  getUserRole,
  removeMember,
  updateMemberRole,
  revokeInvitation,
} from "@/lib/db/queries/organizations";

async function requireAdmin() {
  const user = await requireAuth();
  const adminEmails = (process.env.GOTOFU_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email)) {
    throw new Error("Not authorized");
  }
  return user;
}

export async function createOrgForCustomer(name: string, founderEmail: string) {
  await requireAdmin();

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const adminUser = await requireAdmin();
  const org = await createOrganization(name.trim(), `${slug}-${Date.now().toString(36)}`, adminUser.id);

  // Create invite for founder
  const invitation = await createInvitation(org.id, founderEmail, "ADMIN");

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return {
    orgId: org.id,
    orgName: org.name,
    inviteUrl: `${origin}/accept-invite/${invitation.token}`,
  };
}

export async function generateAdminInviteLink(orgId: string, email: string, role: "ADMIN" | "MEMBER" | "VIEWER" = "ADMIN") {
  await requireAdmin();

  const invitation = await createInvitation(orgId, email || "invite@placeholder.local", role);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return { inviteUrl: `${origin}/accept-invite/${invitation.token}` };
}

export async function adminKickMember(orgId: string, userId: string) {
  await requireAdmin();
  await removeMember(orgId, userId);
  return { success: true };
}

export async function adminChangeRole(orgId: string, userId: string, role: "ADMIN" | "MEMBER" | "VIEWER") {
  await requireAdmin();
  await updateMemberRole(orgId, userId, role);
  return { success: true };
}

export async function adminRevokeInvite(invitationId: string) {
  await requireAdmin();
  await revokeInvitation(invitationId);
  return { success: true };
}
