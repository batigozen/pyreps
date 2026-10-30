import type { Card, CardType, Topic } from "../content/schema.ts";
import { endOfDay } from "./day.ts";

export type PlanState = { due: Date; reps: number; lastReview?: Date | undefined };

export type PlanSettings = { newPerDay: number; maxReviews: number; unlocked: ReadonlySet<string> };

export type PlanInput = {
  cards: readonly Card[];
  topics: readonly Topic[];
  /** FSRS state per card id. A card without one is new. */
  states: ReadonlyMap<string, PlanState>;
  settings: PlanSettings;
  now: Date;
  /** Already done today, so a second session doesn't get the caps again. */
  doneToday: { reviews: number; newCards: number };
};

export type Plan = { queue: string[]; reviews: number; newCards: number };

type Item = { id: string; topic: string; type: CardType };

/** A write card needs at least this many other cards before the next write card. */
export const WRITE_GAP = 4;

/**
 * Orders cards so the same topic doesn't come twice in a row and write cards are at
 * least 4 positions apart, when that is possible. Otherwise keeps the given order.
 */
export function arrange(items: readonly Item[]): string[] {
  const left = [...items];
  const out: Item[] = [];
  let lastWrite = -Infinity;
  while (left.length) {
    const position = out.length;
    const previous = out.at(-1);
    const writeOk = (item: Item) => item.type !== "write" || position - lastWrite >= WRITE_GAP;
    const topicOk = (item: Item) => item.topic !== previous?.topic;
    // Place a write card as soon as allowed when the other cards are only just enough
    // to keep the remaining write cards apart. Otherwise they pile up at the end.
    const writes = left.filter((item) => item.type === "write").length;
    const others = left.length - writes;
    const tight = writes > 0 && others <= (writes - 1) * (WRITE_GAP - 1) + (WRITE_GAP - 1);
    let index = tight
      ? left.findIndex((item) => item.type === "write" && writeOk(item) && topicOk(item))
      : -1;
    if (index < 0) index = left.findIndex((item) => writeOk(item) && topicOk(item));
    if (index < 0) index = left.findIndex(writeOk);
    if (index < 0) index = 0;
    const [item] = left.splice(index, 1);
    if (!item) break;
    if (item.type === "write") lastWrite = position;
    out.push(item);
  }
  return out.map((item) => item.id);
}

/**
 * New cards in course order: level 1 before 2 before 3, and within a level one card from
 * each unlocked topic in turn (topic order), so new cards are mixed too.
 */
export function orderNewCards(cards: readonly Card[], topics: readonly Topic[]): Card[] {
  const topicOrder = new Map(topics.map((topic) => [topic.id, topic.order]));
  const seen = new Map<string, number>();
  const ranked = cards.map((card, fileOrder) => {
    const key = `${card.topic}/${card.level}`;
    const rank = seen.get(key) ?? 0;
    seen.set(key, rank + 1);
    return { card, rank, fileOrder };
  });
  ranked.sort(
    (a, b) =>
      a.card.level - b.card.level ||
      a.rank - b.rank ||
      (topicOrder.get(a.card.topic) ?? 0) - (topicOrder.get(b.card.topic) ?? 0) ||
      a.fileOrder - b.fileOrder,
  );
  return ranked.map((entry) => entry.card);
}

/** Today's queue: due reviews (oldest first, capped), then new cards, then mixed. */
export function planToday({ cards, topics, states, settings, now, doneToday }: PlanInput): Plan {
  const end = endOfDay(now);
  const reviewRoom = Math.max(0, settings.maxReviews - doneToday.reviews);
  const newRoom = Math.max(0, settings.newPerDay - doneToday.newCards);

  // Reviews come from any topic, also locked ones.
  const due = cards
    .flatMap((card) => {
      const state = states.get(card.id);
      return state && state.due < end ? [{ card, due: state.due.getTime() }] : [];
    })
    .sort((a, b) => a.due - b.due)
    .slice(0, reviewRoom)
    .map((entry) => entry.card);

  const fresh = orderNewCards(
    cards.filter((card) => !states.has(card.id) && settings.unlocked.has(card.topic)),
    topics,
  ).slice(0, newRoom);

  return {
    queue: arrange([...due, ...fresh]),
    reviews: due.length,
    newCards: fresh.length,
  };
}

export const PRACTICE_SIZE = 10;

/**
 * "Practise 10" for one topic: due cards first, then cards seen longest ago, then new ones.
 * Any topic can be practised, also a locked one.
 */
export function planPractice(
  topic: string,
  cards: readonly Card[],
  states: ReadonlyMap<string, PlanState>,
  now: Date,
  size = PRACTICE_SIZE,
): string[] {
  const end = endOfDay(now).getTime();
  const inTopic = cards.filter((card) => card.topic === topic);
  const score = (card: Card) => {
    const state = states.get(card.id);
    if (!state) return [2, card.level] as const;
    if (state.due.getTime() < end) return [0, state.due.getTime()] as const;
    return [1, state.lastReview?.getTime() ?? 0] as const;
  };
  const chosen = inTopic
    .map((card, i) => ({ card, score: score(card), i }))
    .sort((a, b) => a.score[0] - b.score[0] || a.score[1] - b.score[1] || a.i - b.i)
    .slice(0, size)
    .map((entry) => entry.card);
  return arrange(chosen);
}
