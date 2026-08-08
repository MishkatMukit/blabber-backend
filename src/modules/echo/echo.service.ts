import { prisma } from "../../lib/prisma";

const getAllByBlabFromDB = async (blabId: string) => {
  return await prisma.echo.findMany({
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
};

const getByIdFromDB = async (id: string) => {
  return await prisma.echo.findUniqueOrThrow({
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
};

const createInDB = async (userId: string, blabId: string, content: string) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  return await prisma.$transaction(async (tx) => {
    const echo = await tx.echo.create({
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

    await tx.blab.update({
      where: { id: blabId },
      data: { echoesCount: { increment: 1 } },
    });

    return echo;
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

  return await prisma.$transaction(async (tx) => {
    await tx.echo.delete({ where: { id } });

    await tx.blab.update({
      where: { id: echo.blabId },
      data: { echoesCount: { decrement: 1 } },
    });
  });
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
