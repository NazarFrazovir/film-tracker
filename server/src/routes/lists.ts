import { Router } from "express";
import { z } from "zod";
import { enrichCollectionItems } from "../lib/mediaEnrich.js";
import { parseMediaType, type MediaType } from "../lib/mediaType.js";
import { warmCache } from "../lib/movieCache.js";
import { prisma } from "../lib/prisma.js";
import { warmTvCache } from "../lib/tvCache.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

function mediaTypeFromReq(req: { query: Record<string, unknown>; body?: unknown }): MediaType {
  const body = req.body as { mediaType?: unknown } | undefined;
  return parseMediaType(req.query.mediaType ?? body?.mediaType);
}

function warmMedia(tmdbId: number, mediaType: MediaType) {
  if (mediaType === "tv") warmTvCache(tmdbId);
  else warmCache(tmdbId);
}

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

  const items = await enrichCollectionItems(
    list.items.map((item) => ({
      tmdbId: item.tmdbId,
      mediaType: parseMediaType(item.mediaType),
      date: item.addedAt,
    })),
  );

  res.json({
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    color: list.color,
    parentId: list.parentId,
    parent: list.parent,
    children: list.children.map(mapChild),
    canHaveChildren: list.parentId === null,
    items,
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
  const mediaType = mediaTypeFromReq(req);

  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
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
    where: { listId_tmdbId_mediaType: { listId: id, tmdbId, mediaType } },
    create: {
      listId: id,
      tmdbId,
      mediaType,
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
  warmMedia(tmdbId, mediaType);

  res.json({ success: true, added: true });
});

const reorderItemSchema = z.object({
  tmdbId: z.number().int(),
  mediaType: z.enum(["movie", "tv"]).optional(),
});

const reorderSchema = z.object({
  items: z.array(reorderItemSchema).min(1).optional(),
  tmdbIds: z.array(z.number().int()).min(1).optional(),
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
  const itemKey = (tmdbId: number, mediaType: MediaType) => `${mediaType}:${tmdbId}`;

  const orderedItems =
    parsed.data.items ??
    parsed.data.tmdbIds?.map((tmdbId) => ({ tmdbId, mediaType: "movie" as const })) ??
    [];

  if (!orderedItems.length) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const existingKeys = new Set(
    existing.map((i) => itemKey(i.tmdbId, parseMediaType(i.mediaType))),
  );
  const orderedKeys = orderedItems.map((i) =>
    itemKey(i.tmdbId, parseMediaType(i.mediaType)),
  );

  if (
    orderedKeys.length !== existing.length ||
    !orderedKeys.every((key) => existingKeys.has(key))
  ) {
    res.status(400).json({ error: "Невірний список елементів" });
    return;
  }

  await prisma.$transaction(
    orderedItems.map((item, position) =>
      prisma.customListItem.update({
        where: {
          listId_tmdbId_mediaType: {
            listId: id,
            tmdbId: item.tmdbId,
            mediaType: parseMediaType(item.mediaType),
          },
        },
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
  const mediaType = mediaTypeFromReq(req);

  const list = await prisma.customList.findFirst({ where: { id, userId } });
  if (!list) {
    res.status(404).json({ error: "Список не знайдено" });
    return;
  }

  await prisma.customListItem.deleteMany({ where: { listId: id, tmdbId, mediaType } });
  await prisma.customList.update({ where: { id }, data: { updatedAt: new Date() } });

  res.json({ success: true, added: false });
});

export default router;