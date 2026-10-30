import { describe, expect, it } from "vitest";
import type { Card, CardType, Topic } from "../../src/content/schema.ts";
import {
  arrange,
  orderNewCards,
  planPractice,
  planToday,
  WRITE_GAP,
  type PlanState,
} from "../../src/srs/planner.ts";

const topics: Topic[] = ["setup", "dicts", "unpack", "net"].map((id, i) => ({
  id,
  title: id,
  module: id === "net" ? 13 : i + 1,
  order: i + 1,
}));

function makeCard(topic: string, n: number, type: CardType = "mcq", level: 1 | 2 | 3 = 1): Card {
  return {
    id: `${topic}-${type.replace("_", "")}-c${n}`,
    topic,
    level,
    type: "mcq",
    prompt: "p",
    explain: "e",
    options: ["a", "b", "c"],
    correct: 0,
    ...(type === "write"
      ? { type: "write", starter: "s", tests: "t", hint: "h", solution: "x", options: undefined }
      : {}),
  } as Card;
}

const now = new Date("2026-10-30T09:00:00");
const settings = { newPerDay: 8, maxReviews: 40, unlocked: new Set(["setup", "dicts", "unpack"]) };
const noneDone = { reviews: 0, newCards: 0 };

/** True when no topic repeats next to itself. */
const noRepeats = (ids: string[], topicOf: (id: string) => string) =>
  ids.every((id, i) => i === 0 || topicOf(id) !== topicOf(ids[i - 1] ?? ""));
const topicOf = (id: string) => id.split("-")[0] ?? "";

describe("arrange", () => {
  it("avoids the same topic twice in a row", () => {
    const items = ["a", "a", "a", "b", "b", "c"].map((topic, i) => ({
      id: `${topic}-${i}`,
      topic,
      type: "mcq" as const,
    }));
    expect(noRepeats(arrange(items), topicOf)).toBe(true);
  });

  it("keeps write cards at least 4 positions apart", () => {
    const items = [
      ...["a", "b", "c"].map((topic) => ({ id: `${topic}-w`, topic, type: "write" as const })),
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `${"abc"[i % 3]}-m${i}`,
        topic: "abc"[i % 3] ?? "",
        type: "mcq" as const,
      })),
    ];
    const order = arrange(items);
    const writes = order.flatMap((id, i) => (id.endsWith("-w") ? [i] : []));
    expect(writes).toHaveLength(3);
    for (let i = 1; i < writes.length; i++)
      expect((writes[i] ?? 0) - (writes[i - 1] ?? 0)).toBeGreaterThanOrEqual(WRITE_GAP);
  });

  it("still returns every card when the rules can't all be met", () => {
    const items = [1, 2, 3].map((i) => ({ id: `a-w${i}`, topic: "a", type: "write" as const }));
    expect(arrange(items).sort()).toEqual(["a-w1", "a-w2", "a-w3"]);
  });
});

describe("orderNewCards", () => {
  it("goes level by level, one topic after another", () => {
    const cards = [
      makeCard("dicts", 1, "mcq", 2),
      makeCard("dicts", 2),
      makeCard("dicts", 3),
      makeCard("setup", 1),
      makeCard("unpack", 1),
      makeCard("setup", 2, "mcq", 3),
    ];
    expect(orderNewCards(cards, topics).map((c) => c.id)).toEqual([
      "setup-mcq-c1",
      "dicts-mcq-c2",
      "unpack-mcq-c1",
      "dicts-mcq-c3",
      "dicts-mcq-c1",
      "setup-mcq-c2",
    ]);
  });
});

describe("planToday", () => {
  const cards = [
    ...Array.from({ length: 10 }, (_, i) => makeCard("dicts", i)),
    ...Array.from({ length: 10 }, (_, i) => makeCard("unpack", i)),
    ...Array.from({ length: 10 }, (_, i) => makeCard("net", i)),
  ];

  it("takes new cards only from unlocked topics, up to the daily cap", () => {
    const plan = planToday({
      cards,
      topics,
      states: new Map(),
      settings,
      now,
      doneToday: noneDone,
    });
    expect(plan.newCards).toBe(8);
    expect(plan.queue.every((id) => !id.startsWith("net"))).toBe(true);
    expect(noRepeats(plan.queue, topicOf)).toBe(true);
  });

  it("puts due reviews first, oldest first, also from locked topics, capped", () => {
    const states = new Map<string, PlanState>([
      ["net-mcq-c0", { due: new Date("2026-10-29T09:00:00"), reps: 2 }],
      ["dicts-mcq-c0", { due: new Date("2026-10-27T09:00:00"), reps: 2 }],
      ["dicts-mcq-c1", { due: new Date("2026-10-31T09:00:00"), reps: 2 }],
    ]);
    const plan = planToday({
      cards,
      topics,
      states,
      settings: { ...settings, maxReviews: 40 },
      now,
      doneToday: noneDone,
    });
    expect(plan.reviews).toBe(2);
    expect(plan.queue.slice(0, 2)).toEqual(["dicts-mcq-c0", "net-mcq-c0"]);
    expect(plan.queue).not.toContain("dicts-mcq-c1");

    const capped = planToday({
      cards,
      topics,
      states,
      settings: { ...settings, maxReviews: 1 },
      now,
      doneToday: noneDone,
    });
    expect(capped.reviews).toBe(1);
  });

  it("counts what was already done today", () => {
    const plan = planToday({
      cards,
      topics,
      states: new Map(),
      settings,
      now,
      doneToday: { reviews: 0, newCards: 6 },
    });
    expect(plan.newCards).toBe(2);
  });

  it("treats a card due before 04:00 tomorrow as due today", () => {
    const states = new Map<string, PlanState>([
      ["dicts-mcq-c0", { due: new Date("2026-10-31T03:00:00"), reps: 1 }],
    ]);
    const plan = planToday({
      cards,
      topics,
      states,
      settings: { ...settings, newPerDay: 0 },
      now,
      doneToday: noneDone,
    });
    expect(plan.queue).toEqual(["dicts-mcq-c0"]);
  });
});

describe("planPractice", () => {
  it("takes due cards, then the oldest seen, then new ones", () => {
    const cards = Array.from({ length: 12 }, (_, i) => makeCard("dicts", i));
    const states = new Map<string, PlanState>([
      [
        "dicts-mcq-c5",
        { due: new Date("2026-11-05T09:00:00"), reps: 2, lastReview: new Date("2026-10-20") },
      ],
      [
        "dicts-mcq-c6",
        { due: new Date("2026-11-05T09:00:00"), reps: 2, lastReview: new Date("2026-10-10") },
      ],
      ["dicts-mcq-c7", { due: new Date("2026-10-29T09:00:00"), reps: 2 }],
    ]);
    const queue = planPractice("dicts", cards, states, now, 4);
    expect(new Set(queue)).toEqual(
      new Set(["dicts-mcq-c7", "dicts-mcq-c6", "dicts-mcq-c5", "dicts-mcq-c0"]),
    );
    expect(queue[0]).toBe("dicts-mcq-c7");
  });
});
