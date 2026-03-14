import { prisma } from "@/lib/db/prisma";

export async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function upsertUser(id: string, email: string, name?: string) {
  return prisma.user.upsert({
    where: { id },
    update: { email, name },
    create: { id, email, name },
  });
}

export async function updateUser(
  userId: string,
  data: { name?: string; avatarUrl?: string; onboardingCompleted?: boolean }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
