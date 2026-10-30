import type { Card } from "../content/schema.ts";
import { endOfDay } from "./day.ts";

/** A card counts as mastered once FSRS expects to keep it for 21 days or more. */
export const MASTERED_STABILITY_DAYS = 21;

type StateLike = { due: Date; stability: number };

export type TopicStats = { total: number; mastered: number; due: number; seen: number };

export function topicStats(
  cards: readonly Card[],
  states: ReadonlyMap<string, StateLike>,
  now: Date,
): Map<string, TopicStats> {
  const end = endOfDay(now);
  const stats = new Map<string, TopicStats>();
  for (const card of cards) {
    const entry = stats.get(card.topic) ?? { total: 0, mastered: 0, due: 0, seen: 0 };
    const state = states.get(card.id);
    entry.total++;
    if (state) {
      entry.seen++;
      if (state.stability >= MASTERED_STABILITY_DAYS) entry.mastered++;
      if (state.due < end) entry.due++;
    }
    stats.set(card.topic, entry);
  }
  return stats;
}

/** "today", "tomorrow", "in 3 days": when a card comes back. */
export function describeDue(due: Date, now: Date): string {
  const end = endOfDay(now);
  if (due < end) return "later today";
  const days = Math.round((due.getTime() - end.getTime()) / 86_400_000) + 1;
  return days <= 1 ? "tomorrow" : `in ${days} days`;
}
