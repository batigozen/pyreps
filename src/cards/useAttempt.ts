import { useState } from "react";
import type { AttemptPhase, Outcome, Result } from "./outcome.ts";
import { useActiveTime } from "./useActiveTime.ts";

type Options = {
  cardId: string;
  /** The current answer as text, or null when nothing is chosen yet. */
  answerKey: string | null;
  isCorrect: () => boolean;
  onDone: (outcome: Outcome) => void;
  /** After the first wrong answer, before the retry. */
  onWrong?: () => void;
};

export type Attempt = {
  phase: AttemptPhase;
  result: Result | null;
  canCheck: boolean;
  check: () => void;
  reveal: () => void;
};

/** One retry, then the answer. The same wrong answer can't be checked twice. */
export function useAttempt({ cardId, answerKey, isCorrect, onDone, onWrong }: Options): Attempt {
  const [phase, setPhase] = useState<AttemptPhase>("answering");
  const [result, setResult] = useState<Result | null>(null);
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const elapsed = useActiveTime();

  const finish = (final: Result) => {
    setPhase("done");
    setResult(final);
    onDone({ cardId, result: final, ms: elapsed() });
  };

  const check = () => {
    if (phase === "done" || answerKey === null) return;
    if (isCorrect()) finish(phase === "answering" ? "first-try" : "retry");
    else if (phase === "answering") {
      setPhase("retry");
      setLastWrong(answerKey);
      onWrong?.();
    } else finish("wrong");
  };

  const reveal = () => {
    if (phase !== "done") finish("shown");
  };

  return {
    phase,
    result,
    canCheck: phase !== "done" && answerKey !== null && answerKey !== lastWrong,
    check,
    reveal,
  };
}
