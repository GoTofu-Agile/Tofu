import { prisma } from "@/lib/db/prisma";

export async function getOrganizationsForUser(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrganization(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { members: true, personaGroups: true, studies: true },
      },
    },
  });
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
  });
}

export async function createOrganization(
  name: string,
  slug: string,
  userId: string,
  isPersonal = false
) {
  return prisma.organization.create({
    data: {
      name,
      slug,
      isPersonal,
      members: {
        create: { userId, role: "OWNER" },
      },
    },
  });
}

export async function createPersonalWorkspace(userId: string, email: string) {
  const slug = `personal-${userId.slice(0, 8)}`;
  return createOrganization("Personal", slug, userId, true);
}

export async function updateOrganization(orgId: string, data: { name?: string; slug?: string }) {
  return prisma.organization.update({
    where: { id: orgId },
    data,
  });
}

export async function getUserRole(orgId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

export async function addMember(orgId: string, userId: string, role: "ADMIN" | "MEMBER" | "VIEWER" = "MEMBER") {
  return prisma.organizationMember.create({
    data: { organizationId: orgId, userId, role },
  });
}

export async function removeMember(orgId: string, userId: string) {
  return prisma.organizationMember.delete({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });
}

export async function updateMemberRole(orgId: string, userId: string, role: "ADMIN" | "MEMBER" | "VIEWER") {
  return prisma.organizationMember.update({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    data: { role },
  });
}

export async function createInvitation(orgId: string, email: string, role: "ADMIN" | "MEMBER" | "VIEWER" = "MEMBER") {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return prisma.organizationInvitation.create({
    data: {
      organizationId: orgId,
      email,
      role,
      expiresAt,
    },
  });
}

export async function getInvitationByToken(token: string) {
  return prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: true },
  });
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await getInvitationByToken(token);
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return null;
  }

  await prisma.$transaction([
    prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: invitation.organizationId, userId } },
      update: {},
      create: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
      },
    }),
    prisma.organizationInvitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return invitation.organization;
}

export async function getOrgProductContext(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      productName: true,
      productDescription: true,
      targetAudience: true,
      industry: true,
      competitors: true,
      websiteUrl: true,
      setupCompleted: true,
    },
  });
}

export async function getPendingInvitations(orgId: string) {
  return prisma.organizationInvitation.findMany({
    where: {
      organizationId: orgId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvitation(invitationId: string) {
  return prisma.organizationInvitation.delete({
    where: { id: invitationId },
  });
}

export async function getAllOrganizations() {
  return prisma.organization.findMany({
    include: {
      _count: {
        select: { members: true, studies: true, personaGroups: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
