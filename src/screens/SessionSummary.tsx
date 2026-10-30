import { useLiveQuery } from "dexie-react-hooks";
import { content } from "../content/content.ts";
import { getStates, type SessionData } from "../db/db.ts";
import { endOfDay } from "../srs/day.ts";

type Props = { session: SessionData; onDone: () => void };

const topicTitle = new Map(content.topics.map((topic) => [topic.id, topic.title]));
const WEEK = 7;

export default function SessionSummary({ session, onDone }: Props) {
  // Count each card once, by its first answer. The repeat at the end is extra practice.
  const first = new Map<string, (typeof session.results)[number]>();
  for (const result of session.results)
    if (!first.has(result.cardId)) first.set(result.cardId, result);
  const perTopic = new Map<string, { right: number; wrong: number }>();
  for (const result of first.values()) {
    const entry = perTopic.get(result.topic) ?? { right: 0, wrong: 0 };
    if (result.result === "first-try" || result.result === "retry") entry.right++;
    else entry.wrong++;
    perTopic.set(result.topic, entry);
  }
  const right = [...perTopic.values()].reduce((n, entry) => n + entry.right, 0);

  const upcoming = useLiveQuery(async () => {
    const states = await getStates();
    const tomorrowEnd = endOfDay(new Date());
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const weekEnd = new Date(tomorrowEnd);
    weekEnd.setDate(weekEnd.getDate() + WEEK - 1);
    let tomorrow = 0;
    let week = 0;
    for (const state of states.values()) {
      if (state.due < tomorrowEnd) tomorrow++;
      if (state.due < weekEnd) week++;
    }
    return { tomorrow, week };
  });

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-4">
      <h1 id="summary-title" className="text-[1.75rem] font-bold">
        {session.mode === "daily" ? "Today's reps are done" : "Practice done"}
      </h1>
      <p data-testid="summary-total" className="text-[1.25rem]">
        {right} of {first.size} right the first time.
      </p>

      <table className="w-full border-collapse overflow-hidden rounded-xl bg-surface">
        <caption className="sr-only">Results per topic</caption>
        <thead>
          <tr className="text-left text-[0.9375rem] text-muted">
            <th className="p-3 font-normal">Topic</th>
            <th className="p-3 text-right font-normal">Right</th>
            <th className="p-3 text-right font-normal">Wrong</th>
          </tr>
        </thead>
        <tbody>
          {[...perTopic].map(([topic, entry]) => (
            <tr key={topic} className="border-t border-border">
              <td className="p-3">{topicTitle.get(topic) ?? topic}</td>
              <td className="p-3 text-right font-bold text-ok">{entry.right}</td>
              <td className="p-3 text-right font-bold text-bad">{entry.wrong}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {upcoming && (
        <p className="text-muted">
          Coming up: {upcoming.tomorrow} {upcoming.tomorrow === 1 ? "card" : "cards"} by tomorrow,{" "}
          {upcoming.week} in the next {WEEK} days.
        </p>
      )}

      <button
        type="button"
        onClick={onDone}
        className="min-h-12 rounded-xl bg-accent px-4 font-bold text-accent-fg"
      >
        Done
      </button>
    </section>
  );
}
