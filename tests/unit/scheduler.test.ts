import { describe, expect, it } from "vitest";
import { Rating, rate, review, switchRating, State } from "../../src/srs/scheduler.ts";

describe("rate", () => {
  const base = { type: "predict", reps: 0, ms: 10_000 } as const;

  it("maps how the card ended", () => {
    expect(rate({ ...base, result: "first-try" })).toBe(Rating.Good);
    expect(rate({ ...base, result: "retry" })).toBe(Rating.Hard);
    expect(rate({ ...base, result: "wrong" })).toBe(Rating.Again);
    expect(rate({ ...base, result: "shown" })).toBe(Rating.Again);
  });

  it("gives Easy only when fast and seen at least twice before", () => {
    expect(rate({ ...base, result: "first-try", ms: 17_000, reps: 2 })).toBe(Rating.Easy);
    expect(rate({ ...base, result: "first-try", ms: 17_000, reps: 1 })).toBe(Rating.Good);
    expect(rate({ ...base, result: "first-try", ms: 18_000, reps: 5 })).toBe(Rating.Good);
  });

  it("uses each type's time budget; slow but right is Hard", () => {
    expect(rate({ ...base, result: "first-try", ms: 46_000 })).toBe(Rating.Hard);
    expect(rate({ ...base, type: "parsons", result: "first-try", ms: 80_000 })).toBe(Rating.Good);
    expect(rate({ ...base, type: "write", result: "first-try", ms: 200_000 })).toBe(Rating.Good);
    expect(rate({ ...base, type: "write", result: "first-try", ms: 250_000 })).toBe(Rating.Hard);
  });
});

describe("switchRating", () => {
  it("only switches Good and Hard", () => {
    expect(switchRating(Rating.Good)).toBe(Rating.Hard);
    expect(switchRating(Rating.Hard)).toBe(Rating.Good);
    expect(switchRating(Rating.Easy)).toBeNull();
    expect(switchRating(Rating.Again)).toBeNull();
  });
});

describe("review", () => {
  it("schedules a new card and grows the interval with Good answers", () => {
    let now = new Date("2026-10-30T09:00:00");
    let { card } = review(undefined, Rating.Good, now);
    expect(card.reps).toBe(1);
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      now = card.due;
      const next = review(card, Rating.Good, now).card;
      gaps.push((next.due.getTime() - now.getTime()) / 86_400_000);
      card = next;
    }
    expect(card.state).toBe(State.Review);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1] ?? 0);
    // maximum_interval is 180; ts-fsrs keeps Good one day longer than Hard, even at the cap.
    expect(Math.max(...gaps)).toBeLessThanOrEqual(181);
  });

  it("brings a forgotten card back soon", () => {
    const now = new Date("2026-10-30T09:00:00");
    const learned = review(
      review(undefined, Rating.Good, now).card,
      Rating.Good,
      new Date("2026-11-02T09:00:00"),
    ).card;
    const lapsed = review(learned, Rating.Again, learned.due).card;
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due.getTime() - learned.due.getTime()).toBeLessThan(86_400_000);
  });
});
