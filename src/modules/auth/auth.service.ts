import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  profilePhoto?: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

const registerInDB = async (payload: RegisterPayload) => {
  const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
      },
    });

    const profile = await tx.profile.create({
      data: {
        userId: createdUser.id,
        userName: payload.name,
        ...(payload.profilePhoto ? { photo: payload.profilePhoto } : {}),
      },
    });

    return { ...createdUser, profile };
  });

  const accessToken = jwtUtils.createToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt_access_secret,
    config.jwt_access_expires_in
  );
  const refreshToken = jwtUtils.createToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        id: user.profile.id,
        userName: user.profile.userName,
        photo: user.profile.photo,
      },
    },
    accessToken,
    refreshToken,
  };
};

const loginInDB = async (payload: LoginPayload) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { profile: true },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const accessToken = jwtUtils.createToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt_access_secret,
    config.jwt_access_expires_in
  );
  const refreshToken = jwtUtils.createToken(
    { id: user.id, email: user.email, role: user.role },
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile
        ? {
            id: user.profile.id,
            userName: user.profile.userName,
            photo: user.profile.photo,
          }
        : null,
    },
    accessToken,
    refreshToken,
  };
};

type UpdateProfilePayload = {
  bio?: string;
  profilePhoto?: string;
};

const updateProfileInDB = async (userId: string, payload: UpdateProfilePayload) => {
  const profile = await prisma.profile.update({
    where: { userId },
    data: {
      ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
      ...(payload.profilePhoto !== undefined ? { photo: payload.profilePhoto } : {}),
    },
  });

  return {
    id: profile.id,
    userName: profile.userName,
    bio: profile.bio,
    photo: profile.photo,
    blabsCount: profile.blabsCount,
  };
};

const refreshTokenInDB = async (refreshToken: string) => {
  const verifiedToken = jwtUtils.verifyToken(refreshToken, config.jwt_refresh_secret);
  if (!verifiedToken.success) {
    throw new Error(verifiedToken.error);
  }

  const { id, email, role } = verifiedToken.data as { id: string; email: string; role: string };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("User not found. Please login again.");
  }

  const newAccessToken = jwtUtils.createToken(
    { id, email, role },
    config.jwt_access_secret,
    config.jwt_access_expires_in
  );
  const newRefreshToken = jwtUtils.createToken(
    { id, email, role },
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

const logoutInDB = async (_token?: string) => {
  // Tokens are stateless JWTs; logout is handled client-side by discarding tokens.
  return { success: true };
};

const getProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    profile: user.profile
      ? {
          id: user.profile.id,
          userName: user.profile.userName,
          bio: user.profile.bio,
          photo: user.profile.photo,
          blabsCount: user.profile.blabsCount,
        }
      : null,
  };
};

export const authServices = {
  registerInDB,
  loginInDB,
  refreshTokenInDB,
  logoutInDB,
  getProfileFromDB,
  updateProfileInDB,
};
