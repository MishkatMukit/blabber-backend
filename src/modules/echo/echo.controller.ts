import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { echoServices } from "./echo.service";

const getAllByBlab = catchAsync(async (req, res) => {
  const result = await echoServices.getAllByBlabFromDB(req.params.blabId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Echoes fetched successfully",
    data: result,
  });
});

const getById = catchAsync(async (req, res) => {
  const result = await echoServices.getByIdFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Echo fetched successfully",
    data: result,
  });
});

const create = catchAsync(async (req, res) => {
  const result = await echoServices.createInDB(
    req.user!.id,
    req.body.blabId,
    req.body.content
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Echo created successfully",
    data: result,
  });
});

const update = catchAsync(async (req, res) => {
  const result = await echoServices.updateInDB(
    req.params.id as string,
    req.user!.id,
    req.body.content
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Echo updated successfully",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  const result = await echoServices.deleteFromDB(req.params.id as string, req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Echo deleted successfully",
    data: result,
  });
});

const applaud = catchAsync(async (req, res) => {
  const result = await echoServices.applaudEchoInDB(req.params.id as string, req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.applauded
      ? "Echo applauded successfully"
      : "Applause removed successfully",
    data: result,
  });
});

export const echoController = {
  getAllByBlab,
  getById,
  create,
  update,
  remove,
  applaud,
};
