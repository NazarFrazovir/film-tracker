import { Router } from "express";
import { z } from "zod";
import { getMoviesCached } from "../lib/movieCache.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

function normalizeTagName(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { movies: true } } },
  });

  res.json(
    tags.map((t) => ({
      id: t.id,
      name: t.name,
      movieCount: t._count.movies,
    })),
  );
});

router.get("/:id/movies", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const id = String(req.params.id);

  const tag = await prisma.tag.findFirst({ where: { id, userId } });
  if (!tag) {
    res.status(404).json({ error: "Тег не знайдено" });
    return;
  }

  const movieTags = await prisma.movieTag.findMany({
    where: { userId, tagId: id },
    orderBy: { addedAt: "desc" },
  });

  const movieMap = await getMoviesCached(movieTags.map((mt) => mt.tmdbId));

  res.json({
    tag: { id: tag.id, name: tag.name },
    movies: movieTags.map((mt) => ({
      tmdbId: mt.tmdbId,
      date: mt.addedAt.toISOString(),
      movie: movieMap.get(mt.tmdbId) ?? null,
    })),
  });
});

router.get("/movie/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const tmdbId = Number(req.params.tmdbId);

  const movieTags = await prisma.movieTag.findMany({
    where: { userId, tmdbId },
    include: { tag: true },
    orderBy: { tag: { name: "asc" } },
  });

  res.json(movieTags.map((mt) => ({ id: mt.tag.id, name: mt.tag.name })));
});

const setTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(40)).max(20),
});

router.put("/movie/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const tmdbId = Number(req.params.tmdbId);
  const parsed = setTagsSchema.safeParse(req.body);

  if (!Number.isFinite(tmdbId) || !parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const names = [
    ...new Set(parsed.data.tags.map(normalizeTagName).filter(Boolean)),
  ];

  await prisma.movieTag.deleteMany({ where: { userId, tmdbId } });

  const resultTags: { id: string; name: string }[] = [];

  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
    });

    await prisma.movieTag.create({
      data: { userId, tmdbId, tagId: tag.id },
    });

    resultTags.push({ id: tag.id, name: tag.name });
  }

  res.json({ tags: resultTags });
});

export default router;