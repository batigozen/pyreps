import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import CardView from "../cards/CardView.tsx";
import type { Outcome } from "../cards/outcome.ts";
import Icon from "../components/Icon.tsx";
import ProgressBar from "../components/ProgressBar.tsx";
import { cardsById } from "../content/content.ts";
import {
  addAttempt,
  changeReview,
  getState,
  loadSession,
  saveReview,
  type ReviewStateRow,
} from "../db/db.ts";
import { endOfDay } from "../srs/day.ts";
import { rate, review, type Grade } from "../srs/scheduler.ts";
import { describeDue } from "../srs/stats.ts";
import { useSessionStore } from "../store/session.ts";
import RatingNote from "./RatingNote.tsx";
import SessionSummary from "./SessionSummary.tsx";

/** What the session needs to change the rating of the card on screen. */
type Rated = {
  before: ReviewStateRow | undefined;
  at: Date;
  rating: Grade;
  logId: number;
  due: Date;
};

export default function SessionScreen() {
  const navigate = useNavigate();
  const { session, begin, answer, rerate, end } = useSessionStore();
  const [loading, setLoading] = useState(session === null);
  const [showing, setShowing] = useState<number | null>(session?.index ?? null);
  const [rated, setRated] = useState<Rated | null>(null);
  const answered = useRef(false);

  // Resume a session after the app was closed. Cards removed from the content are skipped.
  useEffect(() => {
    if (session) return;
    void loadSession().then((saved) => {
      if (saved) {
        const queue = [
          ...saved.queue.slice(0, saved.index),
          ...saved.queue.slice(saved.index).filter((id) => cardsById.has(id)),
        ];
        begin({ ...saved, queue });
        setShowing(saved.index);
      }
      setLoading(false);
    });
  }, [session, begin]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!session) return <Navigate to="/" replace />;

  const position = showing ?? session.index;
  const finish = () => {
    end();
    navigate("/");
  };
  if (position >= session.queue.length) return <SessionSummary session={session} onDone={finish} />;

  const cardId = session.queue[position] ?? "";
  const card = cardsById.get(cardId);
  if (!card) return <Navigate to="/" replace />;

  const onDone = async (outcome: Outcome) => {
    if (answered.current) return;
    answered.current = true;
    const at = new Date();
    const before = await getState(card.id);
    // Practice only changes the schedule of cards that are due anyway (ARCHITECTURE.md).
    const scheduled =
      session.mode === "daily" || (before !== undefined && before.due < endOfDay(at));
    let rating: Grade | null = null;
    if (scheduled) {
      rating = rate({
        result: outcome.result,
        ms: outcome.ms,
        type: card.type,
        reps: before?.reps ?? 0,
      });
      const next = review(before, rating, at);
      const logId = await saveReview({
        cardId: card.id,
        at: at.getTime(),
        rating,
        result: outcome.result,
        ms: outcome.ms,
        mode: session.mode,
        isNew: before === undefined,
        stateBefore: before?.state ?? 0,
        after: next.card,
      });
      setRated({ before, at, rating, logId, due: next.card.due });
    } else {
      await addAttempt({
        cardId: card.id,
        at: at.getTime(),
        result: outcome.result,
        ms: outcome.ms,
      });
    }
    const missed = outcome.result === "wrong" || outcome.result === "shown";
    answer({ cardId: card.id, topic: card.topic, result: outcome.result, rating }, missed);
  };

  const switchTo = async (rating: Grade) => {
    if (!rated) return;
    const next = review(rated.before, rating, rated.at);
    await changeReview(rated.logId, next.card, rating);
    rerate(rating);
    setRated({ ...rated, rating, due: next.card.due });
  };

  const next = () => {
    answered.current = false;
    setRated(null);
    setShowing(position + 1);
  };

  const done = Math.min(position, session.queue.length);

  return (
    <>
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Close. Your progress is saved."
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-muted"
        >
          <Icon name="close" />
        </button>
        <ProgressBar value={done} max={session.queue.length} label="Session progress" />
        <p className="shrink-0 text-[0.9375rem] text-muted" data-testid="session-position">
          {position + 1} / {session.queue.length}
        </p>
      </header>
      <CardView
        key={`${position}-${card.id}`}
        card={card}
        onDone={(outcome) => void onDone(outcome)}
        onNext={next}
        extra={
          rated && (
            <RatingNote
              rating={rated.rating}
              comesBack={describeDue(rated.due, rated.at)}
              onSwitch={(rating) => void switchTo(rating)}
            />
          )
        }
      />
    </>
  );
}
