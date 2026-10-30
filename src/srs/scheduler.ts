import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card as FsrsCard,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";
import type { CardType } from "../content/schema.ts";
import type { Result } from "../cards/outcome.ts";

export { Rating, State } from "ts-fsrs";
export type { FsrsCard, Grade, ReviewLog };

// ARCHITECTURE.md: ts-fsrs defaults, with these two changed.
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, maximum_interval: 180 }));

/** Time to answer before a right answer counts as slow. */
export const BUDGET_MS: Record<CardType, number> = {
  predict: 45_000,
  mcq: 45_000,
  fill: 45_000,
  spot_bug: 45_000,
  parsons: 90_000,
  write: 240_000,
};

/** Faster than this share of the budget can be Easy. */
export const EASY_SHARE = 0.4;
/** Easy also needs this many earlier reviews, so a lucky first answer isn't Easy. */
export const EASY_MIN_REPS = 2;

export type RatingInput = {
  result: Result;
  ms: number;
  type: CardType;
  /** Reviews of this card before this one (0 for a new card). */
  reps: number;
};

/**
 * The automatic rating (ARCHITECTURE.md, "Spaced repetition"):
 * - right first try, no hint, within the budget -> Good
 * - the same, under 40% of the budget, and reviewed at least twice before -> Easy
 * - right after one retry or the hint -> Hard
 * - wrong twice, or the answer shown -> Again
 * A right first try over the budget is Hard: the answer came slowly.
 */
export function rate({ result, ms, type, reps }: RatingInput): Grade {
  switch (result) {
    case "wrong":
    case "shown":
      return Rating.Again;
    case "retry":
      return Rating.Hard;
    case "first-try": {
      const budget = BUDGET_MS[type];
      if (ms > budget) return Rating.Hard;
      if (ms < budget * EASY_SHARE && reps >= EASY_MIN_REPS) return Rating.Easy;
      return Rating.Good;
    }
  }
}

/** "I knew this" / "I guessed": only Good and Hard can be switched, to each other. */
export function switchRating(rating: Grade): Grade | null {
  if (rating === Rating.Good) return Rating.Hard;
  if (rating === Rating.Hard) return Rating.Good;
  return null;
}

export const newCardState = (now: Date): FsrsCard => createEmptyCard(now);

/** The card's next state after a review. */
export function review(state: FsrsCard | undefined, rating: Grade, now: Date) {
  return scheduler.next(state ?? newCardState(now), now, rating);
}

export const RATING_NAME: Record<Grade, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
};
