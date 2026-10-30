import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import ProgressBar from "../components/ProgressBar.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { content } from "../content/content.ts";
import type { Topic } from "../content/schema.ts";
import { getStates } from "../db/db.ts";
import { useSettings } from "../db/useSettings.ts";
import { topicStats, type TopicStats } from "../srs/stats.ts";

const CORE_MODULES = 12;
const EMPTY: TopicStats = { total: 0, mastered: 0, due: 0, seen: 0 };

export default function TopicsScreen() {
  const settings = useSettings();
  const stats = useLiveQuery(async () => topicStats(content.cards, await getStates(), new Date()));
  const unlocked = new Set(settings?.unlocked ?? []);

  const core = content.topics.filter((topic) => topic.module <= CORE_MODULES);
  const decks = content.topics.filter((topic) => topic.module > CORE_MODULES);

  const row = (topic: Topic) => {
    const s = stats?.get(topic.id) ?? EMPTY;
    return (
      <li key={topic.id}>
        <Link
          to={`/topics/${topic.id}`}
          className="flex min-h-16 flex-col gap-2 rounded-xl border border-border bg-surface p-3"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-bold">{topic.title}</span>
            {!unlocked.has(topic.id) && <span className="text-[0.9375rem] text-muted">Off</span>}
          </span>
          <ProgressBar
            value={s.mastered}
            max={s.total}
            label={`${topic.title}: ${s.mastered} of ${s.total} cards mastered`}
            tone="ok"
          />
          <span className="text-[0.9375rem] text-muted">
            {s.total === 0
              ? "No cards yet"
              : `${s.mastered} of ${s.total} mastered${s.due ? ` · ${s.due} due` : ""}`}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <ScreenHeader title="Topics" />
      <p className="mb-4 text-muted">
        A card is mastered when you will likely remember it for 3 weeks.
      </p>
      <h2 className="mb-2 font-bold">Course</h2>
      <ul className="mb-6 flex flex-col gap-2">{core.map(row)}</ul>
      <h2 className="mb-2 font-bold">Extra decks</h2>
      <ul className="flex flex-col gap-2">{decks.map(row)}</ul>
    </>
  );
}
