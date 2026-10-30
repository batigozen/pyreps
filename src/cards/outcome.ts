/**
 * How a card ended. Phase 4 maps this to an FSRS rating:
 * first-try -> Good (or Easy), retry -> Hard, wrong / shown -> Again.
 */
export type Result = "first-try" | "retry" | "wrong" | "shown";

export type Outcome = { cardId: string; result: Result; ms: number };

export type AttemptPhase = "answering" | "retry" | "done";
