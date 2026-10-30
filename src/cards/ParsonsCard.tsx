import { useMemo, useState } from "react";
import type { ParsonsCard as ParsonsCardData } from "../content/schema.ts";
import CodeView from "../components/CodeView.tsx";
import CardFrame from "./CardFrame.tsx";
import { gradeParsons, parsonsPool, suggestIndent, type ParsonsLine } from "./grading.ts";
import type { CardProps } from "./types.ts";
import { useAttempt } from "./useAttempt.ts";

type Placed = { key: number; indent: number };

const MAX_INDENT = 4;

export default function ParsonsCard({ card, onDone, onNext }: CardProps<ParsonsCardData>) {
  const pool = useMemo(() => parsonsPool(card), [card]);
  const textOf = useMemo(() => new Map(pool.map((item) => [item.key, item.text])), [pool]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const program: ParsonsLine[] = placed.map((p) => ({
    text: textOf.get(p.key) ?? "",
    indent: p.indent,
  }));
  const need = card.lines.length;

  const attempt = useAttempt({
    cardId: card.id,
    answerKey: placed.length === need ? JSON.stringify(program) : null,
    isCorrect: () => gradeParsons(card, program),
    onDone,
  });
  const done = attempt.phase === "done";
  const showAnswer = done && (attempt.result === "wrong" || attempt.result === "shown");

  const add = (key: number) =>
    setPlaced((previous) => {
      const last = previous.at(-1);
      const lastLine = last && { text: textOf.get(last.key) ?? "", indent: last.indent };
      return [...previous, { key, indent: suggestIndent(lastLine) }];
    });
  const remove = (index: number) => setPlaced((previous) => previous.filter((_, i) => i !== index));
  const shift = (index: number, delta: number) =>
    setPlaced((previous) =>
      previous.map((p, i) =>
        i === index ? { ...p, indent: Math.min(MAX_INDENT, Math.max(0, p.indent + delta)) } : p,
      ),
    );

  const left = pool.filter((item) => !placed.some((p) => p.key === item.key));
  const lineClass = "font-mono text-[15px] whitespace-pre-wrap [overflow-wrap:anywhere]";
  const iconButton =
    "flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-[18px] disabled:opacity-40";

  return (
    <CardFrame card={card} attempt={attempt} onNext={onNext}>
      <section aria-labelledby={`${card.id}-program`}>
        <h3 id={`${card.id}-program`} className="mb-1 font-bold">
          Your program ({placed.length} of {need} lines)
        </h3>
        <ol className="flex min-h-14 flex-col gap-1.5 rounded-xl border-2 border-dashed border-border p-1.5">
          {placed.length === 0 && (
            <li className="p-2 text-muted">Tap the lines below in the right order.</li>
          )}
          {program.map((line, i) => (
            <li key={placed[i]?.key} className="flex items-stretch gap-1.5">
              <button
                type="button"
                aria-label={`Indent less: line ${i + 1}`}
                disabled={done || line.indent === 0}
                onClick={() => shift(i, -1)}
                className={iconButton}
              >
                ←
              </button>
              <button
                type="button"
                aria-label={`Indent more: line ${i + 1}`}
                disabled={done || line.indent === MAX_INDENT}
                onClick={() => shift(i, 1)}
                className={iconButton}
              >
                →
              </button>
              <button
                type="button"
                aria-label={`Line ${i + 1}, indent ${line.indent}: ${line.text}. Tap to remove.`}
                disabled={done}
                onClick={() => remove(i)}
                className="flex min-h-11 flex-1 items-center rounded-lg border border-accent bg-accent/10 py-1.5 pr-2 text-left"
              >
                <span
                  aria-hidden="true"
                  className="indent-guides shrink-0 self-stretch"
                  style={{ width: `${line.indent * 1.25 + 0.5}rem` }}
                />
                <span className={lineClass}>{line.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {!done && (
        <section aria-labelledby={`${card.id}-pool`}>
          <h3 id={`${card.id}-pool`} className="mb-1 font-bold">
            Lines
          </h3>
          <div className="flex flex-col gap-1.5">
            {left.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-label={`Add: ${item.text}`}
                onClick={() => add(item.key)}
                className="flex min-h-11 items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-left"
              >
                <span className={lineClass}>{item.text}</span>
              </button>
            ))}
          </div>
          {card.distractors?.length ? (
            <p className="mt-1 text-[15px] text-muted">Some lines are not needed.</p>
          ) : null}
        </section>
      )}

      {showAnswer && (
        <section aria-label="Answer">
          <h3 className="mb-1 font-bold">Answer</h3>
          <CodeView code={card.lines.join("\n")} label="Answer" />
        </section>
      )}
    </CardFrame>
  );
}
