import { Router } from "express";
import { z } from "zod";
import { warmCache } from "../lib/movieCache.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/export", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  const [favorites, legendary, watchlist, watched, customLists, tags] =
    await Promise.all([
      prisma.favorite.findMany({ where: { userId }, select: { tmdbId: true } }),
      prisma.legendary.findMany({ where: { userId }, select: { tmdbId: true } }),
      prisma.watchlistItem.findMany({ where: { userId }, select: { tmdbId: true } }),
      prisma.watchedItem.findMany({
        where: { userId },
        select: { tmdbId: true, rating: true, notes: true, watchedAt: true },
      }),
      prisma.customList.findMany({
        where: { userId, parentId: null },
        include: {
          items: { orderBy: { position: "asc" }, select: { tmdbId: true } },
          children: {
            orderBy: { name: "asc" },
            include: {
              items: { orderBy: { position: "asc" }, select: { tmdbId: true } },
            },
          },
        },
      }),
      prisma.tag.findMany({
        where: { userId },
        include: { movies: { select: { tmdbId: true } } },
      }),
    ]);

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    favorites: favorites.map((f) => f.tmdbId),
    legendary: legendary.map((l) => l.tmdbId),
    watchlist: watchlist.map((w) => w.tmdbId),
    watched: watched.map((w) => ({
      tmdbId: w.tmdbId,
      rating: w.rating,
      notes: w.notes,
      watchedAt: w.watchedAt?.toISOString() ?? null,
    })),
    customLists: customLists.map((list) => ({
      name: list.name,
      emoji: list.emoji,
      color: list.color,
      items: list.items.map((i) => i.tmdbId),
      children: list.children.map((child) => ({
        name: child.name,
        emoji: child.emoji,
        items: child.items.map((i) => i.tmdbId),
      })),
    })),
    tags: tags.map((tag) => ({
      name: tag.name,
      movies: tag.movies.map((m) => m.tmdbId),
    })),
  };

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="film-tracker-export-${Date.now()}.json"`,
  );
  res.json(payload);
});

const childListSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(4).nullable().optional(),
  items: z.array(z.number().int()),
});

const importSchema = z.object({
  version: z.number().optional(),
  favorites: z.array(z.number().int()).optional(),
  legendary: z.array(z.number().int()).optional(),
  watchlist: z.array(z.number().int()).optional(),
  watched: z
    .array(
      z.object({
        tmdbId: z.number().int(),
        rating: z.number().int().min(1).max(10).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
        watchedAt: z.string().nullable().optional(),
      }),
    )
    .optional(),
  customLists: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        emoji: z.string().max(4).nullable().optional(),
        color: z.string().max(20).nullable().optional(),
        items: z.array(z.number().int()),
        children: z.array(childListSchema).optional(),
      }),
    )
    .optional(),
  tags: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        movies: z.array(z.number().int()),
      }),
    )
    .optional(),
});

async function importListItems(listId: string, tmdbIds: number[]) {
  let pos = 0;
  for (const tmdbId of tmdbIds) {
    await prisma.customListItem.upsert({
      where: { listId_tmdbId: { listId, tmdbId } },
      create: { listId, tmdbId, position: pos++ },
      update: {},
    });
    warmCache(tmdbId);
  }
}

router.post("/import", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const parsed = importSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Невірний формат файлу" });
    return;
  }

  const data = parsed.data;
  const stats = {
    favorites: 0,
    legendary: 0,
    watchlist: 0,
    watched: 0,
    customLists: 0,
    tags: 0,
  };

  try {
    for (const tmdbId of data.favorites ?? []) {
      await prisma.favorite.upsert({
        where: { userId_tmdbId: { userId, tmdbId } },
        create: { userId, tmdbId },
        update: {},
      });
      stats.favorites++;
      warmCache(tmdbId);
    }

    for (const tmdbId of data.legendary ?? []) {
      await prisma.legendary.upsert({
        where: { userId_tmdbId: { userId, tmdbId } },
        create: { userId, tmdbId },
        update: {},
      });
      stats.legendary++;
      warmCache(tmdbId);
    }

    for (const tmdbId of data.watchlist ?? []) {
      await prisma.watchlistItem.upsert({
        where: { userId_tmdbId: { userId, tmdbId } },
        create: { userId, tmdbId },
        update: {},
      });
      stats.watchlist++;
      warmCache(tmdbId);
    }

    for (const item of data.watched ?? []) {
      await prisma.watchedItem.upsert({
        where: { userId_tmdbId: { userId, tmdbId: item.tmdbId } },
        create: {
          userId,
          tmdbId: item.tmdbId,
          rating: item.rating ?? null,
          notes: item.notes ?? null,
          watchedAt: item.watchedAt ? new Date(item.watchedAt) : null,
        },
        update: {
          rating: item.rating ?? undefined,
          notes: item.notes ?? undefined,
          ...(item.watchedAt !== undefined
            ? { watchedAt: item.watchedAt ? new Date(item.watchedAt) : null }
            : {}),
        },
      });
      stats.watched++;
      warmCache(item.tmdbId);
    }

    for (const listData of data.customLists ?? []) {
      let list = await prisma.customList.findFirst({
        where: { userId, name: listData.name, parentId: null },
      });

      if (!list) {
        list = await prisma.customList.create({
          data: {
            userId,
            name: listData.name,
            emoji: listData.emoji ?? null,
            color: listData.color ?? null,
          },
        });
        stats.customLists++;
      } else {
        list = await prisma.customList.update({
          where: { id: list.id },
          data: {
            emoji: listData.emoji ?? list.emoji,
            color: listData.color ?? list.color,
          },
        });
      }

      await importListItems(list.id, listData.items);

      for (const childData of listData.children ?? []) {
        let child = await prisma.customList.findFirst({
          where: { userId, name: childData.name, parentId: list.id },
        });

        if (!child) {
          child = await prisma.customList.create({
            data: {
              userId,
              parentId: list.id,
              name: childData.name,
              emoji: childData.emoji ?? null,
            },
          });
          stats.customLists++;
        } else {
          child = await prisma.customList.update({
            where: { id: child.id },
            data: { emoji: childData.emoji ?? child.emoji },
          });
        }

        await importListItems(child.id, childData.items);
      }
    }

    for (const tagData of data.tags ?? []) {
      const name = tagData.name.trim().replace(/^#+/, "").toLowerCase();
      if (!name) continue;

      const tag = await prisma.tag.upsert({
        where: { userId_name: { userId, name } },
        create: { userId, name },
        update: {},
      });

      for (const tmdbId of tagData.movies) {
        await prisma.movieTag.upsert({
          where: { userId_tmdbId_tagId: { userId, tmdbId, tagId: tag.id } },
          create: { userId, tmdbId, tagId: tag.id },
          update: {},
        });
        warmCache(tmdbId);
      }
      stats.tags++;
    }

    res.json({ success: true, imported: stats });
  } catch {
    res.status(500).json({ error: "Помилка імпорту" });
  }
});

export default router;