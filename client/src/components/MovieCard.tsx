import type { TMDBMovie } from "../types";
import { movieToCardProps } from "../lib/mediaUtils";
import { MediaCard } from "./MediaCard";

interface MovieCardProps {
  movie: TMDBMovie;
  rating?: number | null;
}

export function MovieCard({ movie, rating }: MovieCardProps) {
  return <MediaCard {...movieToCardProps(movie)} rating={rating} />;
}