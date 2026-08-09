import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { userServices } from "./user.service";

const search = catchAsync(async (req, res) => {
  const query = (req.query.q as string)?.trim() || "";
  const result = query
    ? await userServices.searchProfilesFromDB(query, req.user!.profileId!)
    : [];

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    data: result,
  });
});

const getProfile = catchAsync(async (req, res) => {
  const result = await userServices.getProfileFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: result,
  });
});

const getBlabs = catchAsync(async (req, res) => {
  const result = await userServices.getBlabsFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User blabs fetched successfully",
    data: result,
  });
});

export const userController = {
  search,
  getProfile,
  getBlabs,
};
