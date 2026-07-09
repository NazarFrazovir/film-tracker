import { Router } from "express";
import { z } from "zod";
import { getMoviesCached, warmCache } from "../lib/movieCache.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const listSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(4).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  parentId: z.string().nullable().optional(),
});

function mapChild(list: {
  id: string;
  name: string;
  emoji: string | null;
  _count: { items: number };
}) {
  return {
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    itemCount: list._count.items,
  };
}

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  const lists = await prisma.customList.findMany({
    where: { userId, parentId: null },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
      children: {
        orderBy: { name: "asc" },
        include: { _count: { select: { items: true } } },
      },
    },
  });

  res.json(
    lists.map((l) => {
      const childItemCount = l.children.reduce((s, c) => s + c._count.items, 0);
      return {
        id: l.id,
        name: l.name,
        emoji: l.emoji,
        color: l.color,
        parentId: null,
        itemCount: l._count.items,
        childCount: l.children.length,
        totalItemCount: l._count.items + childItemCount,
        children: l.children.map(mapChild),
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      };
    }),
  );
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const parsed = listSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  const { parentId, ...data } = parsed.data;

  if (parentId) {
    const parent = await prisma.customList.findFirst({
      where: { id: parentId, userId },
    });
    if (!parent) {
      res.status(404).json({ error: "Батьківський список не знайдено" });
      return;
    }
    if (parent.parentId) {
      res.status(400).json({ error: "Підсписки можна створювати лише в основному списку" });
      return;
    }
  }

  const list = await prisma.customList.create({
    data: {
      userId,
      parentId: parentId ?? null,
      ...data,
      emoji: data.emoji ?? null,
      color: data.color ?? null,
    },
  });

  if (parentId) {
    await prisma.customList.update({
      where: { id: parentId },
      data: { updatedAt: new Date() },
    });
  }

  res.status(201).json({
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    color: list.color,
    parentId: list.parentId,
    itemCount: 0,
    childCount: 0,
    totalItemCount: 0,
    children: [],
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  });
});

router.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);

  const list = await prisma.customList.findFirst({
    where: { id, userId },
    include: {
      parent: { select: { id: true, name: true, emoji: true } },
      children: {
        orderBy: { name: "asc" },
        include: { _count: { select: { items: true } } },
      },
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!list) {
    res.status(404).json({ error: "Список не знайдено" });
    return;
  }

  const movieMap = await getMoviesCached(list.items.map((i) => i.tmdbId));

  res.json({
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    color: list.color,
    parentId: list.parentId,
    parent: list.parent,
    children: list.children.map(mapChild),
    canHaveChildren: list.parentId === null,
    items: list.items.map((item) => ({
      tmdbId: item.tmdbId,
      position: item.position,
      date: item.addedAt.toISOString(),
      movie: movieMap.get(item.tmdbId) ?? null,
    })),
  });
});

router.patch("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);
  const parsed = listSchema.partial().omit({ parentId: true }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const existing = await prisma.customList.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json({ error: "Список не знайдено" });
    return;
  }

  const list = await prisma.customList.update({
    where: { id },
    data: parsed.data,
  });

  res.json({
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    color: list.color,
  });
});

router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);

  const existing = await prisma.customList.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json({ error: "Список не знайдено" });
    return;
  }

  await prisma.customList.delete({ where: { id } });

  if (existing.parentId) {
    await prisma.customList.update({
      where: { id: existing.parentId },
      data: { updatedAt: new Date() },
    });
  }

  res.json({ success: true });
});

router.post("/:id/items/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);
  const tmdbId = Number(req.params.tmdbId);

  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID фільму" });
    return;
  }

  const list = await prisma.customList.findFirst({ where: { id, userId } });
  if (!list) {
    res.status(404).json({ error: "Список не знайдено" });
    return;
  }

  const maxPos = await prisma.customListItem.aggregate({
    where: { listId: id },
    _max: { position: true },
  });

  await prisma.customListItem.upsert({
    where: { listId_tmdbId_mediaType: { listId: id, tmdbId, mediaType: "movie" } },
    create: {
      listId: id,
      tmdbId,
      position: (maxPos._max.position ?? -1) + 1,
    },
    update: {},
  });

  await prisma.customList.update({ where: { id }, data: { updatedAt: new Date() } });
  if (list.parentId) {
    await prisma.customList.update({
      where: { id: list.parentId },
      data: { updatedAt: new Date() },
    });
  }
  warmCache(tmdbId);

  res.json({ success: true, added: true });
});

const reorderSchema = z.object({
  tmdbIds: z.array(z.number().int()).min(1),
});

router.patch("/:id/reorder", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);
  const parsed = reorderSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const list = await prisma.customList.findFirst({ where: { id, userId } });
  if (!list) {
    res.status(404).json({ error: "Список не знайдено" });
    return;
  }

  const existing = await prisma.customListItem.findMany({ where: { listId: id } });
  const existingIds = new Set(existing.map((i) => i.tmdbId));
  const { tmdbIds } = parsed.data;

  if (
    tmdbIds.length !== existing.length ||
    !tmdbIds.every((tid) => existingIds.has(tid))
  ) {
    res.status(400).json({ error: "Невірний список фільмів" });
    return;
  }

  await prisma.$transaction(
    tmdbIds.map((tmdbId, position) =>
      prisma.customListItem.update({
        where: { listId_tmdbId_mediaType: { listId: id, tmdbId, mediaType: "movie" } },
        data: { position },
      }),
    ),
  );

  await prisma.customList.update({ where: { id }, data: { updatedAt: new Date() } });

  res.json({ success: true });
});

router.delete("/:id/items/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);
  const tmdbId = Number(req.params.tmdbId);

  const list = await prisma.customList.findFirst({ where: { id, userId } });
  if (!list) {
    res.status(404).json({ error: "Список не знайдено" });
    return;
  }

  await prisma.customListItem.deleteMany({ where: { listId: id, tmdbId } });
  await prisma.customList.update({ where: { id }, data: { updatedAt: new Date() } });

  res.json({ success: true, added: false });
});

export default router;