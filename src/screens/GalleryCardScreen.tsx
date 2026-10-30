import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import CardView from "../cards/CardView.tsx";
import type { Outcome } from "../cards/outcome.ts";
import Icon from "../components/Icon.tsx";
import { galleryCards } from "./gallery.ts";

const RESULT_TEXT: Record<Outcome["result"], string> = {
  "first-try": "right on the first try",
  retry: "right on the second try",
  wrong: "wrong twice",
  shown: "answer shown",
};

export default function GalleryCardScreen() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<Outcome>();
  const index = galleryCards.findIndex((card) => card.id === cardId);
  const card = galleryCards[index];
  if (!card) return <Navigate to="/gallery" replace />;

  const next = galleryCards[index + 1];
  const goNext = () => {
    setOutcome(undefined);
    navigate(next ? `/gallery/${next.id}` : "/gallery");
  };

  return (
    <>
      <header className="mb-4 flex min-h-11 items-center gap-2">
        <Link
          to="/gallery"
          aria-label="All cards"
          className="-ml-2 flex size-11 items-center justify-center rounded-xl text-accent"
        >
          <Icon name="back" />
        </Link>
        <p className="flex-1 text-[0.9375rem] text-muted">
          Card {index + 1} of {galleryCards.length} · {card.topic}
        </p>
      </header>
      <CardView key={card.id} card={card} onDone={setOutcome} onNext={goNext} />
      {outcome?.cardId === card.id && (
        <p data-testid="gallery-outcome" className="mt-4 text-[0.9375rem] text-muted">
          Result: {RESULT_TEXT[outcome.result]}, {(outcome.ms / 1000).toFixed(1)} s
        </p>
      )}
    </>
  );
}
