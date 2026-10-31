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

// --- Stats screen (Phase 7) --------------------------------------------------------

export type DayCell = { day: string; count: number; future: boolean };

const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
};

const keyOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const addDays = (key: string, n: number) => {
  const date = parseDay(key);
  date.setDate(date.getDate() + n);
  return keyOf(date);
};

/** Monday of the week that `day` is in. */
export const weekStart = (day: string) => addDays(day, -((parseDay(day).getDay() + 6) % 7));

/** `weeks` rows of Monday..Sunday, oldest first, ending with the week of `today`. */
export function calendar(
  counts: ReadonlyMap<string, number>,
  today: string,
  weeks = 8,
): DayCell[][] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(first, w * 7 + d);
      return { day, count: counts.get(day) ?? 0, future: day > today };
    }),
  );
}

/** 0 for no practice, then 1..4 by share of the busiest day. */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4;
}

/** Days with practice in each of the last `weeks` weeks (Mon..Sun), oldest first. */
export function activeDaysPerWeek(
  practised: ReadonlySet<string>,
  today: string,
  weeks = 4,
): number[] {
  return calendar(new Map([...practised].map((d) => [d, 1])), today, weeks).map(
    (week) => week.filter((cell) => cell.count > 0).length,
  );
}

type LogLike = { day: string; rating: number; isNew: boolean; stateBefore?: number };

/** FSRS state Review: the card was learned before this answer. */
const REVIEW_STATE = 2;

/** A real memory check. Older log rows have no stateBefore, so they use isNew. */
const isRetentionCheck = (log: LogLike) =>
  log.stateBefore === undefined ? !log.isNew : log.stateBefore === REVIEW_STATE;

/**
 * Share of reviews passed in the last 7 study days (PRD: 7-day retention). A review
 * passes unless it was rated Again (1). Only cards that were already learned count:
 * first sightings and same-day repeats (learning steps) would blur the measure.
 */
export function passRate(logs: readonly LogLike[], today: string) {
  const from = addDays(today, -6);
  const reviews = logs.filter(
    (log) => isRetentionCheck(log) && log.day >= from && log.day <= today,
  );
  const passed = reviews.filter((log) => log.rating > 1).length;
  return { passed, total: reviews.length, rate: reviews.length ? passed / reviews.length : null };
}

/** Answered cards per day for the last `days` days, oldest first. */
export function perDay(dayKeys: readonly string[], today: string, days = 7) {
  const counts = new Map<string, number>();
  for (const day of dayKeys) counts.set(day, (counts.get(day) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1);
    return { day, count: counts.get(day) ?? 0 };
  });
}

type ScheduleState = { state: number; stability: number };

/** New, learning (incl. relearning), review (under 21 days) and mastered card counts. */
export function cardStates(cards: readonly Card[], states: ReadonlyMap<string, ScheduleState>) {
  const result = { new: 0, learning: 0, review: 0, mastered: 0 };
  for (const card of cards) {
    const s = states.get(card.id);
    if (!s) result.new++;
    else if (s.stability >= MASTERED_STABILITY_DAYS) result.mastered++;
    else if (s.state === 2) result.review++;
    else result.learning++;
  }
  return result;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Tue 27 Oct" */
export function dayLabel(day: string): string {
  const date = parseDay(day);
  return `${WEEKDAY[date.getDay()]} ${date.getDate()} ${MONTH[date.getMonth()]}`;
}
