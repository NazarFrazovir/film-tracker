import { Router } from "express";
import { z } from "zod";
import { getMovieCached, getMoviesCached } from "../lib/movieCache.js";
import { getCollectionState, getCollectionStatuses } from "../lib/collectionStatus.js";
import { mediaStatusKey } from "../lib/mediaType.js";
import {
  TMDB_GENRES,
  discoverMovies,
  getMovieExtras,
  getMovieWatchProviders,
  getPersonDetails,
  getPersonMovieCredits,
  searchMovies,
  searchMulti,
} from "../lib/tmdb.js";
import { getUserTmdbIds } from "../lib/userMovies.js";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const batchStatusSchema = z.object({
  items: z
    .array(
      z.object({
        tmdbId: z.number().int(),
        mediaType: z.enum(["movie", "tv"]).default("movie"),
      }),
    )
    .min(1)
    .max(50),
  tmdbIds: z.array(z.number().int()).min(1).max(50).optional(),
});

router.post("/status/batch", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = batchStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const items =
    parsed.data.items ??
    parsed.data.tmdbIds!.map((tmdbId) => ({ tmdbId, mediaType: "movie" as const }));

  const statuses = await getCollectionStatuses(req.user!.userId, items);
  res.json(statuses);
});

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const page = Number(req.query.page ?? 1);

  try {
    const results = await searchMovies(q, page);
    res.json(results);
  } catch {
    res.status(502).json({ error: "Не вдалося отримати дані TMDB" });
  }
});

router.get("/search/multi", async (req, res) => {
  const q = String(req.query.q ?? "");
  const page = Number(req.query.page ?? 1);

  try {
    const results = await searchMulti(q, page);
    res.json(results);
  } catch {
    res.status(502).json({ error: "Не вдалося отримати дані TMDB" });
  }
});

router.get("/genres", (_req, res) => {
  res.json({ genres: TMDB_GENRES });
});

router.get("/discover", optionalAuth, async (req: AuthedRequest, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const genreId = req.query.genreId ? Number(req.query.genreId) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
  const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
  const excludeOwned = req.query.excludeOwned === "true";

  try {
    const owned =
      excludeOwned && req.user ? await getUserTmdbIds(req.user.userId) : null;

    if (!owned) {
      const result = await discoverMovies({
        page: Number.isFinite(page) ? page : 1,
        genreId: Number.isFinite(genreId!) ? genreId : undefined,
        year: Number.isFinite(year!) ? year : undefined,
        minRating: Number.isFinite(minRating!) ? minRating : undefined,
        sortBy,
      });
      res.json(result);
      return;
    }

    const targetSize = 20;
    let currentPage = Number.isFinite(page) ? page : 1;
    let totalPages = 1;
    let totalResults = 0;
    const collected: Awaited<ReturnType<typeof discoverMovies>>["results"] = [];

    while (collected.length < targetSize && currentPage <= totalPages && currentPage <= page + 4) {
      const result = await discoverMovies({
        page: currentPage,
        genreId: Number.isFinite(genreId!) ? genreId : undefined,
        year: Number.isFinite(year!) ? year : undefined,
        minRating: Number.isFinite(minRating!) ? minRating : undefined,
        sortBy,
      });

      totalPages = result.total_pages;
      totalResults = result.total_results;

      for (const movie of result.results) {
        if (!owned.has(movie.id)) collected.push(movie);
        if (collected.length >= targetSize) break;
      }

      currentPage++;
    }

    res.json({
      page,
      results: collected,
      total_pages: totalPages,
      total_results: totalResults,
    });
  } catch (err) {
    console.error("discover failed:", err);
    res.status(502).json({ error: "Не вдалося отримати дані TMDB" });
  }
});

router.get("/recommendations", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  try {
    const [favorites, legendary, ratedWatched] = await Promise.all([
      prisma.favorite.findMany({ where: { userId }, select: { tmdbId: true } }),
      prisma.legendary.findMany({ where: { userId }, select: { tmdbId: true } }),
      prisma.watchedItem.findMany({
        where: { userId, rating: { gte: 7 } },
        select: { tmdbId: true, rating: true },
      }),
    ]);

    const owned = await getUserTmdbIds(userId);

    const genreCounts = new Map<number, number>();
    const sourceWeights = { legendary: 0, favorites: 0, rated: 0 };

    const seedIds = [
      ...legendary.map((r) => r.tmdbId),
      ...favorites.map((r) => r.tmdbId),
      ...ratedWatched.map((r) => r.tmdbId),
    ];

    if (seedIds.length > 0) {
      const movieMap = await getMoviesCached(seedIds);

      const addWeight = (tmdbId: number, weight: number, source: keyof typeof sourceWeights) => {
        const movie = movieMap.get(tmdbId);
        if (!movie) return;
        sourceWeights[source] += weight;
        for (const g of movie.genres ?? []) {
          genreCounts.set(g.id, (genreCounts.get(g.id) ?? 0) + weight);
        }
      };

      for (const row of legendary) addWeight(row.tmdbId, 3, "legendary");
      for (const row of favorites) addWeight(row.tmdbId, 2, "favorites");
      for (const row of ratedWatched) {
        const weight = row.rating! >= 9 ? 3 : row.rating! >= 8 ? 2 : 1;
        addWeight(row.tmdbId, weight, "rated");
      }
    }

    const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const genreId = topGenre?.[0];
    const genreName = genreId
      ? (TMDB_GENRES.find((g) => g.id === genreId)?.name ?? null)
      : null;

    let reason: string | null = null;
    if (genreName) {
      const topSource = (Object.entries(sourceWeights) as [keyof typeof sourceWeights, number][])
        .sort((a, b) => b[1] - a[1])[0];

      if (topSource[1] > 0) {
        const sourceLabel =
          topSource[0] === "legendary"
            ? "легендарних фільмів"
            : topSource[0] === "favorites"
              ? "улюблених фільмів"
              : "високих оцінок";
        reason = `На основі ${sourceLabel} — жанр «${genreName}»`;
      }
    }

    const discoverResult = await discoverMovies({
      genreId,
      sortBy: "vote_average.desc",
      minRating: 7,
      page: 1,
    });

    const results = discoverResult.results
      .filter((m) => !owned.has(m.id))
      .slice(0, 12);

    res.json({ results, basedOn: genreName, reason });
  } catch {
    res.status(502).json({ error: "Не вдалося отримати рекомендації" });
  }
});

router.get("/person/:personId", optionalAuth, async (req: AuthedRequest, res) => {
  const personId = Number(req.params.personId);
  if (!Number.isFinite(personId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  try {
    const [person, credits] = await Promise.all([
      getPersonDetails(personId),
      getPersonMovieCredits(personId),
    ]);

    const filmography = (credits.cast ?? [])
      .filter((m) => m.poster_path && m.release_date)
      .sort((a, b) => b.release_date.localeCompare(a.release_date))
      .slice(0, 40);

    let statuses: Record<
      number,
      { favorites: boolean; legendary: boolean; watchlist: boolean; watched: boolean }
    > = {};

    if (req.user) {
      const raw = await getCollectionStatuses(
        req.user.userId,
        filmography.map((m) => ({ tmdbId: m.id, mediaType: "movie" as const })),
      );
      for (const m of filmography) {
        statuses[m.id] = raw[mediaStatusKey(m.id, "movie")] ?? {
          favorites: false,
          legendary: false,
          watchlist: false,
          watched: false,
        };
      }
    }

    res.json({ person, filmography, statuses });
  } catch (err) {
    console.error("person failed:", personId, err);
    res.status(502).json({ error: "Не вдалося завантажити дані акторів" });
  }
});

router.get("/:tmdbId/extras", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  try {
    const extras = await getMovieExtras(tmdbId);
    res.json(extras);
  } catch {
    res.status(502).json({ error: "Не вдалося завантажити додаткові дані" });
  }
});

router.get("/:tmdbId/providers", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  const region = String(req.query.region ?? "UA").toUpperCase();

  try {
    const movie = await getMovieCached(tmdbId);
    const providers = await getMovieWatchProviders(tmdbId, region, movie.title);
    res.json(providers);
  } catch {
    res.status(502).json({ error: "Не вдалося завантажити провайдерів" });
  }
});

router.get("/:tmdbId", optionalAuth, async (req: AuthedRequest, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  try {
    const movie = await getMovieCached(tmdbId);
    let collections = {
      favorites: false,
      legendary: false,
      watchlist: false,
      watched: false,
      rating: null as number | null,
      notes: null as string | null,
      watchedAt: null as string | null,
    };

    let tags: { id: string; name: string }[] = [];
    let customListIds: string[] = [];

    if (req.user) {
      const userId = req.user.userId;
      collections = await getCollectionState(userId, tmdbId, "movie");

      const [movieTags, listItems] = await Promise.all([
        prisma.movieTag.findMany({
          where: { userId, tmdbId, mediaType: "movie" },
          include: { tag: true },
        }),
        prisma.customListItem.findMany({
          where: { tmdbId, mediaType: "movie", list: { userId } },
          select: { listId: true },
        }),
      ]);

      tags = movieTags.map((mt) => ({ id: mt.tag.id, name: mt.tag.name }));
      customListIds = listItems.map((i) => i.listId);
    }

    res.json({ movie, collections, tags, customListIds });
  } catch {
    res.status(404).json({ error: "Фільм не знайдено" });
  }
});

router.get("/:tmdbId/status", requireAuth, async (req: AuthedRequest, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const collections = await getCollectionState(req.user!.userId, tmdbId, "movie");
  res.json(collections);
});

export default router;