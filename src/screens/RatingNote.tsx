import { Rating, RATING_NAME, switchRating, type Grade } from "../srs/scheduler.ts";

type Props = { rating: Grade; comesBack: string; onSwitch: (rating: Grade) => void };

/** How the card was saved, plus the optional "I knew this" / "I guessed" switch. */
export default function RatingNote({ rating, comesBack, onSwitch }: Props) {
  const other = switchRating(rating);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-muted">
      <p data-testid="rating-note">
        Saved as {RATING_NAME[rating]}. Comes back {comesBack}.
      </p>
      {other !== null && (
        <button
          type="button"
          onClick={() => onSwitch(other)}
          className="min-h-11 rounded-lg px-2 font-bold text-accent underline"
        >
          {other === Rating.Hard ? "I guessed" : "I knew this"}
        </button>
      )}
    </div>
  );
}
