import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function upsertUser(id: string, email: string, name?: string) {
  try {
    return await prisma.user.upsert({
      where: { id },
      update: { email, name },
      create: { id, email, name },
    });
  } catch (error) {
    // Handles Supabase-project switches where auth user id changed but email stayed same.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await getUserByEmail(email);
      if (existing) {
        return prisma.user.update({
          where: { id: existing.id },
          data: { name, email },
        });
      }
    }
    throw error;
  }
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
