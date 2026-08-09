import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { blabServices } from "./blab.service";

const getAll = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit as string) || 5, 1);
  const authorId = (req.query.authorId as string) || undefined;
  const search = (req.query.search as string)?.trim() || undefined;

  const result = await blabServices.getAllFromDB({
    page,
    limit,
    authorId,
    profileId: req.user?.profileId,
    search,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blabs fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getById = catchAsync(async (req, res) => {
  const result = await blabServices.getByIdFromDB(
    req.params.id as string,
    req.user?.profileId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blab fetched successfully",
    data: result,
  });
});

const create = catchAsync(async (req, res) => {
  const result = await blabServices.createInDB(req.user!.id, req.body.content);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Blab created successfully",
    data: result,
  });
});

const update = catchAsync(async (req, res) => {
  const result = await blabServices.updateInDB(
    req.params.id as string,
    req.user!.id,
    req.body.content
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blab updated successfully",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  const result = await blabServices.deleteFromDB(req.params.id as string, req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Blab deleted successfully",
    data: result,
  });
});

const applaud = catchAsync(async (req, res) => {
  const result = await blabServices.applaudBlabInDB(req.params.id as string, req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.applauded
      ? "Blab applauded successfully"
      : "Applause removed successfully",
    data: result,
  });
});

export const blabController = {
  getAll,
  getById,
  create,
  update,
  remove,
  applaud,
};
