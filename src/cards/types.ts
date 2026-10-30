import type { ReactNode } from "react";
import type { Outcome } from "./outcome.ts";

export type CardProps<C> = {
  card: C;
  onDone: (outcome: Outcome) => void;
  onNext: () => void;
  /** Shown under the result when the card has ended (the session puts the rating here). */
  extra?: ReactNode;
};
