import { useEffect, useRef, type ReactNode } from "react";
import type { Card } from "../content/schema.ts";
import RichText from "../components/RichText.tsx";
import type { Result } from "./outcome.ts";
import type { Attempt } from "./useAttempt.ts";

const TYPE_LABEL: Record<Card["type"], string> = {
  predict: "Predict the output",
  mcq: "Choose one",
  fill: "Fill the gap",
  spot_bug: "Find the bug",
  parsons: "Put in order",
  write: "Write code",
};

const RESULT_TEXT: Record<Result, string> = {
  "first-try": "Right!",
  retry: "Right on the second try.",
  wrong: "Not right. The answer is shown.",
  shown: "Here is the answer.",
};

type Props = {
  card: Card;
  attempt: Attempt;
  onNext: () => void;
  extra?: ReactNode;
  children: ReactNode;
};

export default function CardFrame({ card, attempt, onNext, extra, children }: Props) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const { phase, result } = attempt;

  // When the card ends, the Check button goes away. Move focus to the result, so
  // VoiceOver reads it and the keyboard closes.
  useEffect(() => {
    if (phase !== "done") return;
    bannerRef.current?.focus();
    bannerRef.current?.scrollIntoView({ block: "nearest" });
  }, [phase]);

  const good = result === "first-try" || result === "retry";
  const banner =
    phase === "retry"
      ? { text: "Not quite. Try once more.", tone: "bad" }
      : result
        ? { text: RESULT_TEXT[result], tone: good ? "ok" : result === "wrong" ? "bad" : "neutral" }
        : null;

  return (
    <article aria-labelledby={`${card.id}-prompt`} className="flex flex-col gap-4">
      <header>
        <p className="text-[0.9375rem] text-muted">{TYPE_LABEL[card.type]}</p>
        <h2 id={`${card.id}-prompt`} className="text-[1.25rem] leading-snug font-bold">
          <RichText text={card.prompt} />
        </h2>
      </header>

      {children}

      <div ref={bannerRef} tabIndex={-1} role="status" className="outline-none">
        {banner && (
          <p
            className={`rounded-xl border-l-4 px-4 py-3 font-bold ${
              banner.tone === "ok"
                ? "border-ok bg-ok/10 text-ok"
                : banner.tone === "bad"
                  ? "border-bad bg-bad/10 text-bad"
                  : "border-accent bg-accent/10"
            }`}
          >
            {banner.text}
          </p>
        )}
      </div>

      {phase === "done" && extra}

      {phase === "done" && (
        <section aria-label="Why" className="rounded-xl bg-surface-2 p-4">
          <h3 className="mb-1 font-bold">Why</h3>
          <p>
            <RichText text={card.explain} />
          </p>
        </section>
      )}

      <div className="flex flex-col gap-2">
        {phase === "done" ? (
          <button
            type="button"
            onClick={onNext}
            className="min-h-12 rounded-xl bg-accent px-4 font-bold text-accent-fg"
          >
            Next
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={attempt.check}
              disabled={!attempt.canCheck}
              className="min-h-12 rounded-xl bg-accent px-4 font-bold text-accent-fg disabled:opacity-50"
            >
              Check
            </button>
            <button
              type="button"
              onClick={attempt.reveal}
              className="min-h-12 rounded-xl px-4 font-bold text-accent"
            >
              Show answer
            </button>
          </>
        )}
      </div>
    </article>
  );
}
