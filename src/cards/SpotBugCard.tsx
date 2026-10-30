import { useState } from "react";
import type { SpotBugCard as SpotBugCardData } from "../content/schema.ts";
import CodeView, { type LineMark } from "../components/CodeView.tsx";
import CardFrame from "./CardFrame.tsx";
import { gradeSpotBug, spotBugFix } from "./grading.ts";
import type { CardProps } from "./types.ts";
import { useAttempt } from "./useAttempt.ts";

export default function SpotBugCard({ card, onDone, onNext, extra }: CardProps<SpotBugCardData>) {
  const [line, setLine] = useState<number | null>(null);
  const [wrongLines, setWrongLines] = useState<readonly number[]>([]);

  const attempt = useAttempt({
    cardId: card.id,
    answerKey: line === null ? null : String(line),
    isCorrect: () => line !== null && gradeSpotBug(card, line),
    onDone,
    onWrong: () => {
      if (line !== null) setWrongLines((previous) => [...previous, line]);
      setLine(null);
    },
  });
  const done = attempt.phase === "done";

  const marks: Partial<Record<number, LineMark>> = {};
  for (const wrong of wrongLines) marks[wrong] = "bad";
  if (done) {
    if (line !== null && line !== card.bug_line) marks[line] = "bad";
    marks[card.bug_line] = "ok";
  }

  const fix = spotBugFix(card);

  return (
    <CardFrame card={card} attempt={attempt} onNext={onNext} extra={extra}>
      <CodeView
        code={card.code}
        selectable={{
          label: "Tap the line with the bug",
          selected: line,
          onSelect: (n) => {
            if (!wrongLines.includes(n)) setLine(n);
          },
          marks,
          disabled: done,
        }}
      />
      {done && (
        <section aria-label="The fix">
          <h3 className="mb-1 font-bold">The fix, line {fix.line}</h3>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface py-2 font-mono text-[0.9375rem] leading-relaxed">
            <div className="min-w-max">
              <p className="bg-bad/15 px-3 whitespace-pre">
                <span aria-hidden="true">- </span>
                <span className="sr-only">Before: </span>
                {fix.before}
              </p>
              <p className="bg-ok/15 px-3 whitespace-pre">
                <span aria-hidden="true">+ </span>
                <span className="sr-only">After: </span>
                {fix.after}
              </p>
            </div>
          </div>
        </section>
      )}
    </CardFrame>
  );
}
