import { prisma } from "../../lib/prisma";

type ProfileBrief = {
  id: string;
  userName: string;
  photo: string | null;
};

type MessageBrief = {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
};

type ConversationSummary = {
  id: string;
  updatedAt: Date;
  otherUser: ProfileBrief | null;
  lastMessage: MessageBrief | null;
  unread: number;
};

const serializeConversation = (
  conversation: {
    id: string;
    updatedAt: Date;
    participants: Array<{ userId: string; user: ProfileBrief }>;
    messages?: MessageBrief[];
  },
  profileId: string,
  unread: number
): ConversationSummary => {
  const otherUser =
    conversation.participants.find((p) => p.userId !== profileId)?.user ?? null;
  const lastMessage = conversation.messages?.[0] ?? null;

  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt,
    otherUser,
    lastMessage,
    unread,
  };
};

const getUnreadCount = async (conversationId: string, profileId: string) => {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: profileId },
      readBy: { none: { userId: profileId } },
    },
  });
};

const getConversationsFromDB = async (profileId: string) => {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId: profileId },
    select: {
      conversation: {
        select: {
          id: true,
          updatedAt: true,
          participants: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  userName: true,
                  photo: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              senderId: true,
              content: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const conversationIds = rows.map((row) => row.conversation.id);

  const unreadRows = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: profileId },
      readBy: { none: { userId: profileId } },
    },
    _count: { _all: true },
  });

  const unreadMap = new Map(
    unreadRows.map((row) => [row.conversationId, row._count._all])
  );

  return rows.map((row) =>
    serializeConversation(row.conversation, profileId, unreadMap.get(row.conversation.id) ?? 0)
  );
};

const getOrCreateConversationFromDB = async (profileId: string, recipientId: string) => {
  if (recipientId === profileId) {
    throw new Error("You cannot start a conversation with yourself.");
  }

  const recipient = await prisma.profile.findUnique({
    where: { id: recipientId },
    select: { id: true, userName: true, photo: true },
  });

  if (!recipient) {
    throw new Error("Recipient profile not found.");
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: profileId } } },
        { participants: { some: { userId: recipientId } } },
      ],
    },
    select: {
      id: true,
      updatedAt: true,
      participants: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              userName: true,
              photo: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          senderId: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (existing && existing.participants.length === 2) {
    const unread = await getUnreadCount(existing.id, profileId);
    return serializeConversation(existing, profileId, unread);
  }

  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({ data: {} });

    await tx.conversationParticipant.createMany({
      data: [
        { conversationId: created.id, userId: profileId },
        { conversationId: created.id, userId: recipientId },
      ],
    });

    return created;
  });

  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt,
    otherUser: recipient,
    lastMessage: null,
    unread: 0,
  };
};

const getMessagesFromDB = async (conversationId: string, profileId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: { select: { userId: true } } },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  if (!conversation.participants.some((p) => p.userId === profileId)) {
    throw new Error("You are not a participant of this conversation.");
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      content: true,
      createdAt: true,
    },
  });

  await prisma.messageRead.createMany({
    data: messages
      .filter((message) => message.senderId !== profileId)
      .map((message) => ({
        messageId: message.id,
        userId: profileId,
      })),
    skipDuplicates: true,
  });

  return messages;
};

export const conversationServices = {
  getConversationsFromDB,
  getOrCreateConversationFromDB,
  getMessagesFromDB,
};
