// Seven study days with a fake clock: the planner and FSRS together, like the real app.
import { describe, expect, it } from "vitest";
import type { Card, CardType, Topic } from "../../src/content/schema.ts";
import { planToday, WRITE_GAP, type PlanState } from "../../src/srs/planner.ts";
import { rate, review, type FsrsCard } from "../../src/srs/scheduler.ts";
import type { Result } from "../../src/cards/outcome.ts";

const TOPICS = ["setup", "dicts", "unpack", "iter", "functions", "classes", "net"];
const topics: Topic[] = TOPICS.map((id, i) => ({
  id,
  title: id,
  module: id === "net" ? 13 : i + 1,
  order: i + 1,
}));
const TYPES: CardType[] = [
  "predict",
  "mcq",
  "fill",
  "spot_bug",
  "parsons",
  "predict",
  "mcq",
  "write",
];

const cards: Card[] = TOPICS.flatMap((topic) =>
  Array.from({ length: 16 }, (_, i) => {
    const type = TYPES[i % TYPES.length] ?? "mcq";
    return {
      id: `${topic}-${type.replace("_", "")}-c${i}`,
      topic,
      type,
      level: ((i % 3) + 1) as 1 | 2 | 3,
      prompt: "p",
      explain: "e",
    } as unknown as Card;
  }),
);
const typeOf = new Map(cards.map((card) => [card.id, card.type]));
const topicOf = new Map(cards.map((card) => [card.id, card.topic]));

/** A learner who gets about 75% right the first time, the same way on every run. */
function answer(id: string, day: number, attempt: number): Result {
  let h = 7;
  for (const char of `${id}:${day}:${attempt}`) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  const roll = h % 100;
  if (roll < 75) return "first-try";
  if (roll < 88) return "retry";
  return "wrong";
}

const settings = {
  newPerDay: 8,
  maxReviews: 40,
  unlocked: new Set(TOPICS.filter((t) => t !== "net")),
};

type DayLog = { day: number; queue: number; reviews: number; newCards: number; minutes: number };

function simulate(days: number) {
  const states = new Map<string, FsrsCard>();
  const firstSeen = new Map<string, number>();
  const seenOn = new Map<string, Set<number>>();
  const log: DayLog[] = [];
  const queues: string[][] = [];

  for (let day = 1; day <= days; day++) {
    const now = new Date(2026, 10, day, 9, 0, 0);
    const planStates = new Map<string, PlanState>(
      [...states].map(([id, s]) => [id, { due: s.due, reps: s.reps, lastReview: s.last_review }]),
    );
    const plan = planToday({
      cards,
      topics,
      states: planStates,
      settings,
      now,
      doneToday: { reviews: 0, newCards: 0 },
    });
    queues.push(plan.queue);

    // Answer each card; Again comes back once at the end, like the session screen.
    const queue = [...plan.queue];
    const requeued = new Set<string>();
    let ms = 0;
    let clock = now.getTime();
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i] ?? "";
      const type = typeOf.get(id) ?? "mcq";
      const result = answer(id, day, i);
      const spent = type === "write" ? 150_000 : type === "parsons" ? 45_000 : 20_000;
      ms += spent;
      clock += spent;
      const before = states.get(id);
      const rating = rate({ result, ms: spent, type, reps: before?.reps ?? 0 });
      states.set(id, review(before, rating, new Date(clock)).card);
      if (!firstSeen.has(id)) firstSeen.set(id, day);
      seenOn.set(id, (seenOn.get(id) ?? new Set()).add(day));
      if (result === "wrong" && !requeued.has(id)) {
        requeued.add(id);
        queue.push(id);
      }
    }
    log.push({
      day,
      queue: plan.queue.length,
      reviews: plan.reviews,
      newCards: plan.newCards,
      minutes: Math.round(ms / 6000) / 10,
    });
  }
  return { log, queues, firstSeen, seenOn };
}

describe("7 days of daily sessions", () => {
  const { log, queues, firstSeen, seenOn } = simulate(7);

  it("prints the week (for the phase summary)", () => {
    console.table(log);
    expect(log).toHaveLength(7);
  });

  it("starts with 8 new cards and never passes the caps", () => {
    expect(log[0]).toMatchObject({ newCards: 8, reviews: 0 });
    for (const day of log) {
      expect(day.newCards).toBeLessThanOrEqual(8);
      expect(day.reviews).toBeLessThanOrEqual(40);
    }
  });

  it("brings back every card from day 1 later in the week", () => {
    const dayOne = [...firstSeen].filter(([, day]) => day === 1).map(([id]) => id);
    for (const id of dayOne) expect([...(seenOn.get(id) ?? [])].some((day) => day > 1)).toBe(true);
  });

  it("never gives new cards from a locked topic", () => {
    expect([...firstSeen.keys()].some((id) => id.startsWith("net-"))).toBe(false);
  });

  it("mixes topics and spaces out write cards", () => {
    for (const queue of queues) {
      const repeats = queue.filter(
        (id, i) => i > 0 && topicOf.get(id) === topicOf.get(queue[i - 1] ?? ""),
      ).length;
      expect(repeats).toBeLessThanOrEqual(1);
      const writes = queue.flatMap((id, i) => (typeOf.get(id) === "write" ? [i] : []));
      for (let i = 1; i < writes.length; i++) {
        expect((writes[i] ?? 0) - (writes[i - 1] ?? 0)).toBeGreaterThanOrEqual(WRITE_GAP);
      }
    }
  });

  // Minutes are only an estimate (20 s per tap card, 45 s parsons, 150 s write). The
  // real "about 10 minutes" check is done on the phone.
  it("keeps every queue within the daily caps", () => {
    for (const day of log) expect(day.queue).toBeLessThanOrEqual(8 + 40);
  });
});
