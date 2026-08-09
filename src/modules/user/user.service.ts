import { prisma } from "../../lib/prisma";

const getProfileFromDB = async (profileId: string) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      user: {
        select: {
          email: true,
          createdAt: true,
        },
      },
    },
  });

  return {
    id: profile.id,
    email: profile.user.email,
    userName: profile.userName,
    bio: profile.bio,
    photo: profile.photo,
    blabsCount: profile.blabsCount,
    createdAt: profile.user.createdAt,
  };
};

const getBlabsFromDB = async (profileId: string) => {
  return await prisma.blab.findMany({
    where: { authorId: profileId },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          userName: true,
          photo: true,
        },
      },
      _count: {
        select: {
          echoes: true,
          applause: true,
        },
      },
    },
  });
};

export const userServices = {
  getProfileFromDB,
  getBlabsFromDB,
};
