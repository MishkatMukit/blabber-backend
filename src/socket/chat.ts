import type { Server, Socket } from "socket.io";
import config from "../config";
import { jwtUtils } from "../utils/jwt";
import { prisma } from "../lib/prisma";

const parseCookies = (cookieHeader: string | undefined) => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(rest.join("="));
    }
  }

  return cookies;
};

const isParticipantOf = async (conversationId: string, profileId: string) => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId: profileId } },
    },
    select: { id: true },
  });

  return Boolean(conversation);
};

const getParticipantIds = async (conversationId: string) => {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });

  return participants.map((participant) => participant.userId);
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

const serializeMessage = (message: {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  content: message.content,
  createdAt: message.createdAt,
});

export const registerChatHandlers = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.accessToken || (socket.handshake.auth?.token as string | undefined);

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);
      if (!verifiedToken.success) {
        return next(new Error("Unauthorized"));
      }

      const { id } = verifiedToken.data as { id: string };
      const user = await prisma.user.findUnique({
        where: { id },
        include: { profile: { select: { id: true } } },
      });

      if (!user?.profile) {
        return next(new Error("Profile required"));
      }

      socket.data.profileId = user.profile.id;
      socket.data.userId = user.id;
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const profileId = socket.data.profileId as string;
    socket.join(`user:${profileId}`);

    socket.on("join:conversations", async (conversationIds: string[]) => {
      const ids = Array.isArray(conversationIds) ? conversationIds : [];

      for (const conversationId of ids) {
        if (await isParticipantOf(conversationId, profileId)) {
          socket.join(`conversation:${conversationId}`);
        }
      }
    });

    socket.on(
      "message:send",
      async (payload: { conversationId?: string; content?: string }) => {
        const conversationId = payload?.conversationId;
        const content = typeof payload?.content === "string" ? payload.content.trim() : "";

        if (!conversationId || !content) return;
        if (!(await isParticipantOf(conversationId, profileId))) return;

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: profileId,
            content,
          },
        });

        const messagePayload = serializeMessage(message);

        io.to(`conversation:${conversationId}`).emit("message:new", messagePayload);

        for (const participantId of await getParticipantIds(conversationId)) {
          io.to(`user:${participantId}`).emit("message:new", messagePayload);
        }
      }
    );

    socket.on("message:read", async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId || !(await isParticipantOf(conversationId, profileId))) return;

      const unreadMessages = await prisma.message.findMany({
        where: { conversationId, senderId: { not: profileId } },
        select: { id: true },
      });

      await prisma.messageRead.createMany({
        data: unreadMessages.map((message) => ({
          messageId: message.id,
          userId: profileId,
        })),
        skipDuplicates: true,
      });

      for (const participantId of await getParticipantIds(conversationId)) {
        const unread = await getUnreadCount(conversationId, participantId);
        io.to(`user:${participantId}`).emit("unread:update", { conversationId, unread });
      }
    });

    const relayTyping =
      (event: string) => (payload: { conversationId?: string }) => {
        const conversationId = payload?.conversationId;
        if (!conversationId) return;
        socket.to(`conversation:${conversationId}`).emit(event, { conversationId });
      };

    socket.on("typing:start", relayTyping("typing:start"));
    socket.on("typing:stop", relayTyping("typing:stop"));
  });
};
