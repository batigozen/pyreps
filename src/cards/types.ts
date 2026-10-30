import type { Outcome } from "./outcome.ts";

export type CardProps<C> = {
  card: C;
  onDone: (outcome: Outcome) => void;
  onNext: () => void;
};
