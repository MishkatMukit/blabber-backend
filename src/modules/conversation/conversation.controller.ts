import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { getSocketServer } from "../../socket";
import { conversationServices } from "./conversation.service";

const getAll = catchAsync(async (req, res) => {
  if (!req.user?.profileId) {
    throw new Error("A profile is required to use conversations.");
  }

  const result = await conversationServices.getConversationsFromDB(req.user.profileId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Conversations fetched successfully",
    data: result,
  });
});

const create = catchAsync(async (req, res) => {
  if (!req.user?.profileId) {
    throw new Error("A profile is required to use conversations.");
  }

  const result = await conversationServices.getOrCreateConversationFromDB(
    req.user.profileId,
    req.body.recipientId as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Conversation fetched successfully",
    data: result,
  });
});

const getMessages = catchAsync(async (req, res) => {
  if (!req.user?.profileId) {
    throw new Error("A profile is required to use conversations.");
  }

  const result = await conversationServices.getMessagesFromDB(
    req.params.id as string,
    req.user.profileId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messages fetched successfully",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  if (!req.user?.profileId) {
    throw new Error("A profile is required to use conversations.");
  }

  const result = await conversationServices.deleteConversationFromDB(
    req.params.id as string,
    req.user.profileId
  );

  const io = getSocketServer();
  if (io) {
    const payload = { conversationId: req.params.id };
    io.to(`conversation:${req.params.id}`).emit("conversation:deleted", payload);
    for (const participantId of result.participantIds) {
      io.to(`user:${participantId}`).emit("conversation:deleted", payload);
    }
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Conversation deleted successfully",
    data: result,
  });
});

export const conversationController = {
  getAll,
  create,
  getMessages,
  remove,
};
