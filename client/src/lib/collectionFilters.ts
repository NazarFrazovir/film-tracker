import type { CollectionEntry, CollectionType, SortOption } from "../types";

export function getUniqueGenres(items: CollectionEntry[]): string[] {
  const genres = new Set<string>();
  for (const item of items) {
    for (const g of item.movie?.genres ?? []) {
      genres.add(g.name);
    }
  }
  return [...genres].sort();
}

export function filterAndSortItems(
  items: CollectionEntry[],
  type: CollectionType,
  sort: SortOption,
  genre: string,
  minTmdbRating: number,
): CollectionEntry[] {
  let result = items.filter((i) => i.movie);

  if (genre) {
    result = result.filter((i) =>
      i.movie!.genres?.some((g) => g.name === genre),
    );
  }

  if (minTmdbRating > 0) {
    result = result.filter((i) => i.movie!.vote_average >= minTmdbRating);
  }

  result.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.date.localeCompare(b.date);
      case "title":
        return a.movie!.title.localeCompare(b.movie!.title, "uk");
      case "tmdb-rating":
        return b.movie!.vote_average - a.movie!.vote_average;
      case "user-rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "date-desc":
      default:
        return b.date.localeCompare(a.date);
    }
  });

  if (type !== "watched" && sort === "user-rating") {
    result.sort((a, b) => b.date.localeCompare(a.date));
  }

  return result;
}