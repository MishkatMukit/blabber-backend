import { prisma } from "../../lib/prisma";

type GetAllParams = {
  page: number;
  limit: number;
  authorId?: string;
  profileId?: string;
};

const getAllFromDB = async ({ page, limit, authorId, profileId }: GetAllParams) => {
  const skip = (page - 1) * limit;
  const where = authorId ? { authorId } : {};

  const [blabs, total] = await prisma.$transaction([
    prisma.blab.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
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
    }),
    prisma.blab.count({ where }),
  ]);

  const applaudedIds = await getApplaudedIds(profileId, blabs.map((blab) => blab.id));

  return {
    data: blabs.map((blab) => ({ ...blab, applauded: applaudedIds.has(blab.id) })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getApplaudedIds = async (profileId: string | undefined, blabIds: string[]) => {
  if (!profileId || blabIds.length === 0) return new Set<string>();

  const rows = await prisma.blabApplause.findMany({
    where: {
      userId: profileId,
      blabId: { in: blabIds },
    },
    select: { blabId: true },
  });

  return new Set(rows.map((row) => row.blabId));
};

const getByIdFromDB = async (id: string, profileId?: string) => {
  const blab = await prisma.blab.findUniqueOrThrow({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          userName: true,
          photo: true,
        },
      },
      echoes: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              userName: true,
              photo: true,
            },
          },
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

  const applaudedIds = await getApplaudedIds(profileId, [blab.id]);

  return { ...blab, applauded: applaudedIds.has(blab.id) };
};

const createInDB = async (userId: string, content: string) => {
  // userId is the authenticated User's id; a blab is authored by their Profile
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  return await prisma.blab.create({
    data: {
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
          echoes: true,
          applause: true,
        },
      },
    },
  });
};

const updateInDB = async (id: string, userId: string, content: string) => {
  const blab = await prisma.blab.findUniqueOrThrow({ where: { id } });

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  if (blab.authorId !== profile.id) {
    throw new Error("You can only update your own blabs.");
  }

  return await prisma.blab.update({
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
          echoes: true,
          applause: true,
        },
      },
    },
  });
};

const deleteFromDB = async (id: string, userId: string) => {
  const blab = await prisma.blab.findUniqueOrThrow({ where: { id } });

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  if (blab.authorId !== profile.id) {
    throw new Error("You can only delete your own blabs.");
  }

  return await prisma.blab.delete({ where: { id } });
};

const applaudBlabInDB = async (id: string, userId: string) => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId },
  });

  const existing = await prisma.blabApplause.findUnique({
    where: {
      userId_blabId: {
        userId: profile.id,
        blabId: id,
      },
    },
  });

  // Toggle applause
  if (existing) {
    await prisma.blabApplause.delete({
      where: {
        userId_blabId: {
          userId: profile.id,
          blabId: id,
        },
      },
    });
    return { applauded: false };
  }

  await prisma.blabApplause.create({
    data: {
      userId: profile.id,
      blabId: id,
    },
  });
  return { applauded: true };
};

export const blabServices = {
  getAllFromDB,
  getByIdFromDB,
  createInDB,
  updateInDB,
  deleteFromDB,
  applaudBlabInDB,
};
