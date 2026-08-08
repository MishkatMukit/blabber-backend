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
  const result = await authServices.refreshTokenInDB(req.body.refreshToken);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tokens refreshed successfully",
    data: result,
  });
});

const logout = catchAsync(async (req, res) => {
  await authServices.logoutInDB();

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged out successfully",
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

export const authController = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
};
