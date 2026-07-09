import type { CollectionEntry, CollectionType, SortOption } from "../types";
import {
  entryHasMedia,
  getEntryGenres,
  getEntryTitle,
  getEntryVoteAverage,
} from "./mediaUtils";

export function getUniqueGenres(items: CollectionEntry[]): string[] {
  const genres = new Set<string>();
  for (const item of items) {
    for (const g of getEntryGenres(item)) {
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
  let result = items.filter(entryHasMedia);

  if (genre) {
    result = result.filter((i) =>
      getEntryGenres(i).some((g) => g.name === genre),
    );
  }

  if (minTmdbRating > 0) {
    result = result.filter((i) => getEntryVoteAverage(i) >= minTmdbRating);
  }

  function compareDate(a: string, b: string, asc: boolean): number {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return asc ? a.localeCompare(b) : b.localeCompare(a);
  }

  result.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return compareDate(a.date, b.date, true);
      case "title":
        return getEntryTitle(a).localeCompare(getEntryTitle(b), "uk");
      case "tmdb-rating":
        return getEntryVoteAverage(b) - getEntryVoteAverage(a);
      case "user-rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "date-desc":
      default:
        return compareDate(a.date, b.date, false);
    }
  });

  if (type !== "watched" && sort === "user-rating") {
    result.sort((a, b) => b.date.localeCompare(a.date));
  }

  return result;
}