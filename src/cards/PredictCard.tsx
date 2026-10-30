import { useId, useState } from "react";
import type { PredictCard as PredictCardData } from "../content/schema.ts";
import CodeView from "../components/CodeView.tsx";
import CardFrame from "./CardFrame.tsx";
import ChoiceList from "./ChoiceList.tsx";
import { gradePredict, gradePredictChoice, normaliseOutput } from "./grading.ts";
import type { CardProps } from "./types.ts";
import { useAttempt } from "./useAttempt.ts";

export default function PredictCard({ card, onDone, onNext }: CardProps<PredictCardData>) {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [ruledOut, setRuledOut] = useState<ReadonlySet<number>>(new Set());
  const { options } = card;
  const typedKey = normaliseOutput(typed);

  const attempt = useAttempt({
    cardId: card.id,
    answerKey: options ? (choice === null ? null : String(choice)) : typedKey || null,
    isCorrect: () =>
      options
        ? choice !== null && gradePredictChoice(card, options[choice] ?? "")
        : gradePredict(card, typed),
    onDone,
    onWrong: () => {
      if (choice === null) return;
      setRuledOut((previous) => new Set(previous).add(choice));
      setChoice(null);
    },
  });
  const done = attempt.phase === "done";
  const showAnswer = done && (attempt.result === "wrong" || attempt.result === "shown");

  const answerLines = normaliseOutput(card.answer).split("\n").length;
  const inputClass =
    "w-full rounded-xl border-2 border-border bg-surface px-3 py-2 font-mono text-base focus:border-accent";
  const inputProps = {
    id: inputId,
    value: typed,
    readOnly: done,
    autoCapitalize: "off",
    autoCorrect: "off",
    autoComplete: "off",
    spellCheck: false,
    "aria-describedby": `${inputId}-hint`,
  } as const;

  return (
    <CardFrame card={card} attempt={attempt} onNext={onNext}>
      <CodeView code={card.code} />

      {options ? (
        <ChoiceList
          label="Output"
          options={options}
          selected={choice}
          onSelect={setChoice}
          ruledOut={ruledOut}
          correct={options.indexOf(card.answer)}
          done={done}
          mono
        />
      ) : (
        <div>
          <label htmlFor={inputId} className="mb-1 block font-bold">
            Your answer
          </label>
          {answerLines > 1 ? (
            <textarea
              {...inputProps}
              rows={answerLines}
              wrap="off"
              onChange={(event) => setTyped(event.target.value)}
              className={`${inputClass} resize-none`}
            />
          ) : (
            <input
              {...inputProps}
              type="text"
              enterKeyHint="done"
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && attempt.canCheck) attempt.check();
              }}
              className={inputClass}
            />
          )}
          <p id={`${inputId}-hint`} className="mt-1 text-[15px] text-muted">
            {answerLines > 1
              ? `Type exactly what Python prints. It is ${answerLines} lines.`
              : "Type exactly what Python prints."}
          </p>
        </div>
      )}

      {showAnswer && !options && (
        <section aria-label="Answer">
          <h3 className="mb-1 font-bold">Answer</h3>
          <pre className="overflow-x-auto rounded-xl border-2 border-ok bg-ok/10 px-3 py-2 text-[15px]">
            {card.answer}
          </pre>
        </section>
      )}
    </CardFrame>
  );
}
