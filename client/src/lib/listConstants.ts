import type { CSSProperties } from "react";
import type { ListTemplate } from "../types";

export const LIST_EMOJI_OPTIONS = ["🎬", "🍿", "🌧️", "👻", "💫", "🔥", "🎭", "📽️", "📂", "🎯"];

export const LIST_TEMPLATES: ListTemplate[] = [
  { name: "Фільми для дощу", emoji: "🌧️", color: "#2a4a6b" },
  { name: "Вечір жахів", emoji: "👻", color: "#4a5568" },
  { name: "Комедії на вечір", emoji: "🍿", color: "#c9a227" },
  { name: "Романтика", emoji: "💫", color: "#8b3a5c" },
  { name: "Класика", emoji: "🎭", color: "#6b4f8a" },
  { name: "Бойовики", emoji: "🔥", color: "#8b2635" },
];

export const LIST_COLOR_OPTIONS: { label: string; value: string | null }[] = [
  { label: "Без кольору", value: null },
  { label: "Золото", value: "#c9a227" },
  { label: "Бордо", value: "#8b2635" },
  { label: "Фіолет", value: "#6b4f8a" },
  { label: "Зелень", value: "#2d5a3d" },
  { label: "Океан", value: "#2a4a6b" },
  { label: "Рожевий", value: "#8b3a5c" },
  { label: "Сірий", value: "#4a5568" },
];

export function listCardStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    borderLeftWidth: "3px",
    borderLeftColor: color,
    borderLeftStyle: "solid",
  };
}