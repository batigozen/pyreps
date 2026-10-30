import type { Card } from "../content/schema.ts";
import FillCard from "./FillCard.tsx";
import McqCard from "./McqCard.tsx";
import PredictCard from "./PredictCard.tsx";
import SpotBugCard from "./SpotBugCard.tsx";
import type { CardProps } from "./types.ts";

/** Give it `key={card.id}`, so each card starts fresh. */
export default function CardView({ card, onDone, onNext }: CardProps<Card>) {
  const props = { onDone, onNext };
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
    case "write":
      return <p className="text-muted">This card type comes in the next phase.</p>;
  }
}
