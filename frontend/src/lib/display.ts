import type { Difficulty } from "./api";

export const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: "text-emerald-400 border-emerald-400/40",
  medium: "text-amber-300 border-amber-300/40",
  hard: "text-orange-400 border-orange-400/40",
  extreme: "text-red-400 border-red-400/40",
};

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
