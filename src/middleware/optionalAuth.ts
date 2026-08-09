import type { NextFunction, Request, Response } from "express";
import config from "../config";
import { jwtUtils } from "../utils/jwt";
import { prisma } from "../lib/prisma";

const optionalAuth = () => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization?.split(" ")[1]
        : req.headers.authorization);

    if (!token) {
      return next();
    }

    const verifiedToken = jwtUtils.verifyToken(token as string, config.jwt_access_secret);
    if (!verifiedToken.success) {
      return next();
    }

    const { id } = verifiedToken.data as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: { select: { id: true } } },
    });

    if (user?.profile) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        profileId: user.profile.id,
      };
    }

    next();
  };
};

export default optionalAuth;