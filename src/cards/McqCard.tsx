import { useState } from "react";
import type { McqCard as McqCardData } from "../content/schema.ts";
import CodeView from "../components/CodeView.tsx";
import CardFrame from "./CardFrame.tsx";
import ChoiceList from "./ChoiceList.tsx";
import { gradeMcq } from "./grading.ts";
import type { CardProps } from "./types.ts";
import { useAttempt } from "./useAttempt.ts";

export default function McqCard({ card, onDone, onNext, extra }: CardProps<McqCardData>) {
  const [choice, setChoice] = useState<number | null>(null);
  const [ruledOut, setRuledOut] = useState<ReadonlySet<number>>(new Set());

  const attempt = useAttempt({
    cardId: card.id,
    answerKey: choice === null ? null : String(choice),
    isCorrect: () => choice !== null && gradeMcq(card, choice),
    onDone,
    onWrong: () => {
      if (choice === null) return;
      setRuledOut((previous) => new Set(previous).add(choice));
      setChoice(null);
    },
  });

  return (
    <CardFrame card={card} attempt={attempt} onNext={onNext} extra={extra}>
      {card.code && <CodeView code={card.code} />}
      <ChoiceList
        label="Answers"
        options={card.options}
        selected={choice}
        onSelect={setChoice}
        ruledOut={ruledOut}
        correct={card.correct}
        done={attempt.phase === "done"}
      />
    </CardFrame>
  );
}
