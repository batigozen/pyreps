import type { Card } from "../content/schema.ts";
import FillCard from "./FillCard.tsx";
import McqCard from "./McqCard.tsx";
import ParsonsCard from "./ParsonsCard.tsx";
import PredictCard from "./PredictCard.tsx";
import SpotBugCard from "./SpotBugCard.tsx";
import type { CardProps } from "./types.ts";
import WriteCard from "./WriteCard.tsx";

/** Give it `key={card.id}`, so each card starts fresh. */
export default function CardView({ card, onDone, onNext, extra }: CardProps<Card>) {
  const props = { onDone, onNext, extra };
  switch (card.type) {
    case "predict":
      return <PredictCard card={card} {...props} />;
    case "mcq":
      return <McqCard card={card} {...props} />;
    case "fill":
      return <FillCard card={card} {...props} />;
    case "spot_bug":
      return <SpotBugCard card={card} {...props} />;
    case "parsons":
      return <ParsonsCard card={card} {...props} />;
    case "write":
      return <WriteCard card={card} {...props} />;
  }
}
