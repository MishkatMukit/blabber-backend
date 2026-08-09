import { prisma } from "../../lib/prisma";

const getApplaudedIds = async (profileId: string | undefined, echoIds: string[]) => {
  if (!profileId || echoIds.length === 0) return new Set<string>();

  const rows = await prisma.echoApplause.findMany({
    where: {
      userId: profileId,
      echoId: { in: echoIds },
    },
    select: { echoId: true },
  });

  return new Set(rows.map((row) => row.echoId));
};

const getAllByBlabFromDB = async (blabId: string, profileId?: string) => {
  const echoes = await prisma.echo.findMany({
    where: { blabId },
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
          applause: true,
        },
      },
    },
  });

  const applaudedIds = await getApplaudedIds(profileId, echoes.map((echo) => echo.id));

  return echoes.map((echo) => ({ ...echo, applauded: applaudedIds.has(echo.id) }));
};

const getByIdFromDB = async (id: string, profileId?: string) => {
  const echo = await prisma.echo.findUniqueOrThrow({
    where: { id },
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
          applause: true,
        },
      },
    },
  });

  const applaudedIds = await getApplaudedIds(profileId, [echo.id]);

  return { ...echo, applauded: applaudedIds.has(echo.id) };
};

const createInDB = async (userId: string, blabId: string, content: string) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  return await prisma.echo.create({
    data: {
      blabId,
      authorId: profile.id,
      content,
    },
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
          applause: true,
        },
      },
    },
  });
};

const updateInDB = async (id: string, userId: string, content: string) => {
  const echo = await prisma.echo.findUniqueOrThrow({ where: { id } });

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  if (echo.authorId !== profile.id) {
    throw new Error("You can only update your own echoes.");
  }

  return await prisma.echo.update({
    where: { id },
    data: { content },
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
          applause: true,
        },
      },
    },
  });
};

const deleteFromDB = async (id: string, userId: string) => {
  const echo = await prisma.echo.findUniqueOrThrow({ where: { id } });

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  if (echo.authorId !== profile.id) {
    throw new Error("You can only delete your own echoes.");
  }

  return await prisma.echo.delete({ where: { id } });
};

const applaudEchoInDB = async (id: string, userId: string) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  const existing = await prisma.echoApplause.findUnique({
    where: {
      userId_echoId: {
        userId: profile.id,
        echoId: id,
      },
    },
  });

  if (existing) {
    await prisma.echoApplause.delete({
      where: {
        userId_echoId: {
          userId: profile.id,
          echoId: id,
        },
      },
    });
    return { applauded: false };
  }

  await prisma.echoApplause.create({
    data: {
      userId: profile.id,
      echoId: id,
    },
  });
  return { applauded: true };
};

export const echoServices = {
  getAllByBlabFromDB,
  getByIdFromDB,
  createInDB,
  updateInDB,
  deleteFromDB,
  applaudEchoInDB,
};
