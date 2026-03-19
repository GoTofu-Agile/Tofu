import { prisma } from "@/lib/db/prisma";

export async function createConversation(orgId: string, userId: string) {
  return prisma.chatConversation.create({
    data: { organizationId: orgId, userId },
  });
}

export async function getConversationsForUser(userId: string, orgId: string) {
  return prisma.chatConversation.findMany({
    where: { userId, organizationId: orgId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function getConversation(id: string) {
  return prisma.chatConversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function addChatMessage(
  conversationId: string,
  role: string,
  content: string
) {
  return prisma.chatMessage.create({
    data: { conversationId, role, content },
  });
}

export async function updateConversationTitle(id: string, title: string) {
  return prisma.chatConversation.update({
    where: { id },
    data: { title },
  });
}

export async function deleteConversation(id: string) {
  return prisma.chatConversation.delete({ where: { id } });
}
