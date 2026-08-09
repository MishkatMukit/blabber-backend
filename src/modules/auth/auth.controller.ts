import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { clearAuthCookies, setAuthCookies } from "../../middleware/auth";
import { authServices } from "./auth.service";

const register = catchAsync(async (req, res) => {
  const result = await authServices.registerInDB(req.body);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const result = await authServices.loginInDB(req.body);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  const result = await authServices.refreshTokenInDB(token);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tokens refreshed successfully",
    data: result,
  });
});

const logout = catchAsync(async (req, res) => {
  await authServices.logoutInDB(req.body.refreshToken || req.cookies?.refreshToken);

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged out successfully",
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const { userName, bio, profilePhoto } = req.body;

  const result = await authServices.updateProfileInDB(req.user!.id, {
    userName,
    bio,
    profilePhoto,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const getProfile = catchAsync(async (req, res) => {
  const result = await authServices.getProfileFromDB(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: result,
  });
});

const checkUsername = catchAsync(async (req, res) => {
  const userName = (req.query.userName as string)?.trim();

  if (!userName) {
    throw new Error("Username is required");
  }

  const result = await authServices.checkUsernameAvailability(userName);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Username availability checked successfully",
    data: result,
  });
});

export const authController = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  checkUsername,
};
