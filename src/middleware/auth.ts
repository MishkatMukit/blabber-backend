import type { NextFunction, Request, Response } from "express";
import { type Role } from "../../generated/prisma/enums";
import catchAsync from "../utils/catchAsync";
import config from "../config";
import { jwtUtils } from "../utils/jwt";
import type { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization?.split(" ")[1]
        : req.headers.authorization);

    if (!token) {
      throw new Error("You are not logged in. Please login to access resources.");
    }

    const verifiedToken = jwtUtils.verifyToken(token as string, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new Error(verifiedToken.error);
    }

    const { id, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role as Role)) {
      throw new Error("Forbidden. You don't have permission to access this resource");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new Error("User not found. Please login again.");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      ...(user.profile ? { profileId: user.profile.id } : {}),
    };

    next();
  });
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
};

export default auth;
export { setAuthCookies, clearAuthCookies };
