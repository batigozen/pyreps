import { describe, expect, it } from "vitest";
import type { Card } from "../../src/content/schema.ts";
import {
  activeDaysPerWeek,
  calendar,
  cardStates,
  dayLabel,
  heatLevel,
  passRate,
  perDay,
  weekStart,
} from "../../src/srs/stats.ts";

describe("calendar", () => {
  it("has 8 weeks of Monday..Sunday ending with this week", () => {
    const weeks = calendar(new Map([["2026-10-29", 12]]), "2026-10-31");
    expect(weeks).toHaveLength(8);
    expect(weeks.at(-1)?.map((c) => c.day)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(weeks[0]?.[0]?.day).toBe("2026-09-07");
    expect(weeks.at(-1)?.[3]).toEqual({ day: "2026-10-29", count: 12, future: false });
    expect(weeks.at(-1)?.[6]?.future).toBe(true);
  });

  it("finds the Monday of a week, also across a month", () => {
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
  });

  it("labels days in plain English", () => {
    expect(dayLabel("2026-10-27")).toBe("Tue 27 Oct");
  });
});

describe("heatLevel", () => {
  it("is 0 for no practice and 1..4 by share of the busiest day", () => {
    expect([0, 1, 5, 10, 20].map((n) => heatLevel(n, 20))).toEqual([0, 1, 1, 2, 4]);
    expect(heatLevel(3, 0)).toBe(0);
  });
});

describe("activeDaysPerWeek", () => {
  it("counts practice days per week, oldest first", () => {
    const days = new Set(["2026-10-12", "2026-10-13", "2026-10-26", "2026-10-27", "2026-10-31"]);
    expect(activeDaysPerWeek(days, "2026-10-31")).toEqual([0, 2, 0, 3]);
  });
});

describe("passRate", () => {
  const log = (day: string, rating: number, isNew = false) => ({ day, rating, isNew });

  it("counts reviews of the last 7 days; Again is a fail; new cards don't count", () => {
    const logs = [
      log("2026-10-31", 3),
      log("2026-10-30", 2),
      log("2026-10-27", 1),
      log("2026-10-25", 3),
      log("2026-10-24", 1),
      log("2026-10-31", 1, true),
    ];
    expect(passRate(logs, "2026-10-31")).toEqual({ passed: 3, total: 4, rate: 0.75 });
  });

  it("counts only cards that were learned before (state Review)", () => {
    const logs = [
      { day: "2026-10-31", rating: 1, isNew: false, stateBefore: 1 },
      { day: "2026-10-31", rating: 3, isNew: false, stateBefore: 2 },
      { day: "2026-10-31", rating: 1, isNew: false, stateBefore: 3 },
    ];
    expect(passRate(logs, "2026-10-31")).toEqual({ passed: 1, total: 1, rate: 1 });
  });

  it("has no rate without reviews", () => {
    expect(passRate([], "2026-10-31").rate).toBeNull();
  });
});

describe("perDay", () => {
  it("counts answers per day for the last 7 days", () => {
    const counts = perDay(["2026-10-31", "2026-10-31", "2026-10-29", "2026-10-20"], "2026-10-31");
    expect(counts.map((d) => d.count)).toEqual([0, 0, 0, 0, 1, 0, 2]);
    expect(counts[0]?.day).toBe("2026-10-25");
  });
});

describe("cardStates", () => {
  it("splits cards into new, learning, review and mastered", () => {
    const cards = ["a", "b", "c", "d", "e"].map((id) => ({ id }) as Card);
    const states = new Map([
      ["b", { state: 1, stability: 0.5 }],
      ["c", { state: 3, stability: 2 }],
      ["d", { state: 2, stability: 9 }],
      ["e", { state: 2, stability: 30 }],
    ]);
    expect(cardStates(cards, states)).toEqual({ new: 1, learning: 2, review: 1, mastered: 1 });
  });
});
