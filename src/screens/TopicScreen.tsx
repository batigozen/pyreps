import { useLiveQuery } from "dexie-react-hooks";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import Icon from "../components/Icon.tsx";
import ProgressBar from "../components/ProgressBar.tsx";
import RichText from "../components/RichText.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { content } from "../content/content.ts";
import { getStates } from "../db/db.ts";
import { dayKey, endOfDay } from "../srs/day.ts";
import { planPractice, PRACTICE_SIZE } from "../srs/planner.ts";
import { MASTERED_STABILITY_DAYS } from "../srs/stats.ts";
import { useSessionStore } from "../store/session.ts";

const TYPE_NAME = {
  predict: "Predict",
  mcq: "Choose one",
  fill: "Fill the gap",
  spot_bug: "Find the bug",
  parsons: "Put in order",
  write: "Write code",
} as const;

export default function TopicScreen() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const begin = useSessionStore((store) => store.begin);
  const states = useLiveQuery(getStates);
  const topic = content.topics.find((t) => t.id === topicId);
  if (!topic) return <Navigate to="/topics" replace />;

  const cards = content.cards.filter((card) => card.topic === topic.id);
  const now = new Date();
  const end = endOfDay(now);
  const status = (id: string) => {
    const state = states?.get(id);
    if (!state) return "New";
    if (state.due < end) return "Due";
    return state.stability >= MASTERED_STABILITY_DAYS ? "Mastered" : "Learning";
  };
  const mastered = cards.filter((card) => status(card.id) === "Mastered").length;

  const practise = () => {
    const queue = planPractice(topic.id, content.cards, states ?? new Map(), now);
    begin({
      mode: "practice",
      topic: topic.id,
      day: dayKey(now),
      queue,
      index: 0,
      requeued: [],
      results: [],
    });
    navigate("/session");
  };

  return (
    <>
      <ScreenHeader
        title={topic.title}
        leading={
          <Link
            to="/topics"
            aria-label="All topics"
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-accent"
          >
            <Icon name="back" />
          </Link>
        }
      />
      <ProgressBar value={mastered} max={cards.length} label="Mastered" tone="ok" />
      <p className="mt-1 mb-4 text-[0.9375rem] text-muted">
        {mastered} of {cards.length} mastered
      </p>
      <button
        type="button"
        onClick={practise}
        disabled={cards.length === 0 || !states}
        className="mb-2 min-h-12 w-full rounded-xl bg-accent px-4 font-bold text-accent-fg disabled:opacity-50"
      >
        Practise {Math.min(PRACTICE_SIZE, cards.length)}
      </button>
      <p className="mb-6 text-[0.9375rem] text-muted">
        Extra practice. Only cards that are due change their schedule.
      </p>

      <h2 className="mb-2 font-bold">Cards</h2>
      {cards.length === 0 ? (
        <p className="text-muted">No cards yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((card) => (
            <li key={card.id} className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-1 flex justify-between gap-2 text-[0.9375rem] text-muted">
                <span>
                  {TYPE_NAME[card.type]} · level {card.level}
                </span>
                <span>{status(card.id)}</span>
              </p>
              <p>
                <RichText text={card.prompt} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
