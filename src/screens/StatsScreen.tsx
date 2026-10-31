import { useLiveQuery } from "dexie-react-hooks";
import ActivityCalendar from "../components/ActivityCalendar.tsx";
import DailyColumns from "../components/DailyColumns.tsx";
import PassRateMeter from "../components/PassRateMeter.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import StateBreakdown from "../components/StateBreakdown.tsx";
import StatTile from "../components/StatTile.tsx";
import { content } from "../content/content.ts";
import { getStates, statsData } from "../db/db.ts";
import { dayKey, streak } from "../srs/day.ts";
import { activeDaysPerWeek, calendar, cardStates, passRate, perDay } from "../srs/stats.ts";

/** PRD success criteria: 5+ days a week, and a 7-day pass rate of 80% or more. */
const DAYS_GOAL = 5;
const PASS_TARGET = 0.8;

export default function StatsScreen() {
  const data = useLiveQuery(async () => {
    const now = new Date();
    const today = dayKey(now);
    const [{ logs, answeredDays }, states] = await Promise.all([statsData(), getStates()]);
    const counts = new Map<string, number>();
    for (const day of answeredDays) counts.set(day, (counts.get(day) ?? 0) + 1);
    const practised = new Set(answeredDays);
    return {
      today,
      streak: streak(practised, now),
      weeks: activeDaysPerWeek(practised, today, 4),
      calendar: calendar(counts, today, 8),
      daily: perDay(answeredDays, today, 7),
      pass: passRate(logs, today),
      states: cardStates(content.cards, states),
    };
  });

  const section = "rounded-2xl bg-surface p-4";
  const h2 = "mb-3 text-[1.125rem] font-bold";

  return (
    <>
      <ScreenHeader title="Stats" />
      {data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Streak"
              value={data.streak === 1 ? "1 day" : `${data.streak} days`}
              testId="stats-streak"
            />
            <StatTile
              label="This week"
              value={`${data.weeks.at(-1) ?? 0} of ${DAYS_GOAL} days`}
              detail={`Last 4 weeks: ${data.weeks.join(", ")} days`}
              testId="stats-week"
            />
          </div>

          <section aria-labelledby="pass-title" className={section}>
            <h2 id="pass-title" className={h2}>
              Reviews passed, last 7 days
            </h2>
            <PassRateMeter passed={data.pass.passed} total={data.pass.total} target={PASS_TARGET} />
          </section>

          <section aria-labelledby="cal-title" className={section}>
            <h2 id="cal-title" className={h2}>
              Practice, last 8 weeks
            </h2>
            <ActivityCalendar weeks={data.calendar} today={data.today} />
          </section>

          <section aria-labelledby="daily-title" className={section}>
            <h2 id="daily-title" className={h2}>
              Cards per day, last 7 days
            </h2>
            <DailyColumns days={data.daily} />
          </section>

          <section aria-labelledby="states-title" className={section}>
            <h2 id="states-title" className={h2}>
              Your cards
            </h2>
            <StateBreakdown counts={data.states} />
          </section>
        </div>
      )}
    </>
  );
}
