import { useState } from "react";
import type { FillCard as FillCardData } from "../content/schema.ts";
import CodeView from "../components/CodeView.tsx";
import CardFrame from "./CardFrame.tsx";
import ChoiceList from "./ChoiceList.tsx";
import { gradeFill } from "./grading.ts";
import type { CardProps } from "./types.ts";
import { useAttempt } from "./useAttempt.ts";

type Mark = "ok" | "bad" | null;

const SLOT_CLASS: Record<"ok" | "bad" | "empty" | "filled", string> = {
  ok: "border-ok bg-ok/15",
  bad: "border-bad bg-bad/15",
  empty: "border-accent text-muted",
  filled: "border-accent bg-accent/10",
};

export default function FillCard({ card, onDone, onNext }: CardProps<FillCardData>) {
  const [picks, setPicks] = useState<(string | null)[]>(() => card.blanks.map(() => null));
  const [marks, setMarks] = useState<Mark[]>(() => card.blanks.map(() => null));
  const complete = picks.every((pick) => pick !== null);

  const attempt = useAttempt({
    cardId: card.id,
    answerKey: complete ? JSON.stringify(picks) : null,
    isCorrect: () => gradeFill(card, picks).correct,
    onDone,
    // Partly right counts as wrong, but we show which blanks were right.
    onWrong: () => setMarks(gradeFill(card, picks).blanks.map((ok) => (ok ? "ok" : "bad"))),
  });
  const done = attempt.phase === "done";
  const many = card.blanks.length > 1;

  const pick = (blank: number, value: string) => {
    setPicks((previous) => previous.map((old, i) => (i === blank ? value : old)));
    setMarks((previous) => previous.map((old, i) => (i === blank ? null : old)));
  };

  const renderBlank = (index: number) => {
    const blank = card.blanks[index];
    const value = done ? blank?.answer : picks[index];
    const state = done ? "ok" : (marks[index] ?? (value ? "filled" : "empty"));
    return (
      <span className={`rounded-md border-b-2 px-1 ${SLOT_CLASS[state]}`}>
        {value ?? (many ? ` ${index + 1} ` : "____")}
      </span>
    );
  };

  return (
    <CardFrame card={card} attempt={attempt} onNext={onNext}>
      <CodeView code={card.code} renderBlank={renderBlank} />
      {card.blanks.map((blank, i) => (
        <div key={i}>
          <p id={`${card.id}-blank-${i}`} className="mb-2 font-bold">
            {many ? `Blank ${i + 1}` : "Choose the missing part"}
          </p>
          <ChoiceList
            label={many ? `Blank ${i + 1}` : "Missing part"}
            options={blank.options}
            selected={picks[i] === null ? null : blank.options.indexOf(picks[i] ?? "")}
            onSelect={(option) => pick(i, blank.options[option] ?? "")}
            ruledOut={
              marks[i] === "bad" && picks[i] !== null
                ? new Set([blank.options.indexOf(picks[i] ?? "")])
                : undefined
            }
            correct={blank.options.indexOf(blank.answer)}
            done={done}
            mono
            chips
          />
        </div>
      ))}
    </CardFrame>
  );
}
