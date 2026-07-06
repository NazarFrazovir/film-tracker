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
});

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  const lists = await prisma.customList.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  res.json(
    lists.map((l) => ({
      id: l.id,
      name: l.name,
      emoji: l.emoji,
      color: l.color,
      itemCount: l._count.items,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
  );
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const parsed = listSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  const list = await prisma.customList.create({
    data: { userId, ...parsed.data, emoji: parsed.data.emoji ?? null, color: parsed.data.color ?? null },
  });

  res.status(201).json({
    id: list.id,
    name: list.name,
    emoji: list.emoji,
    color: list.color,
    itemCount: 0,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  });
});

router.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);

  const list = await prisma.customList.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { position: "asc" } } },
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
  const parsed = listSchema.partial().safeParse(req.body);

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
    where: { listId_tmdbId: { listId: id, tmdbId } },
    create: {
      listId: id,
      tmdbId,
      position: (maxPos._max.position ?? -1) + 1,
    },
    update: {},
  });

  await prisma.customList.update({ where: { id }, data: { updatedAt: new Date() } });
  warmCache(tmdbId);

  res.json({ success: true, added: true });
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