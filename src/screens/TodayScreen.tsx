import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router";
import Icon from "../components/Icon.tsx";
import PythonStatusBadge from "../components/PythonStatusBadge.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { content } from "../content/content.ts";
import { countToday, getDailyDone, getStates, loadSession, practisedDays } from "../db/db.ts";
import { useSettings } from "../db/useSettings.ts";
import { dayKey, streak } from "../srs/day.ts";
import { planToday } from "../srs/planner.ts";
import { useSessionStore } from "../store/session.ts";

export default function TodayScreen() {
  const settings = useSettings();
  const navigate = useNavigate();
  const begin = useSessionStore((store) => store.begin);

  const data = useLiveQuery(async () => {
    if (!settings) return undefined;
    const now = new Date();
    const [states, doneToday, days, session, dailyDone] = await Promise.all([
      getStates(),
      countToday(now),
      practisedDays(),
      loadSession(),
      getDailyDone(),
    ]);
    const today = dayKey(now);
    const plan = planToday({
      cards: content.cards,
      topics: content.topics,
      states,
      settings: { ...settings, unlocked: new Set(settings.unlocked) },
      now,
      doneToday,
    });
    const open =
      session?.mode === "daily" && session.day === today && session.index < session.queue.length
        ? session
        : null;
    return { plan, today, open, streak: streak(days, now), doneToday: dailyDone === today };
  }, [settings]);

  const start = () => {
    if (!data) return;
    begin({
      mode: "daily",
      day: data.today,
      queue: data.plan.queue,
      index: 0,
      requeued: [],
      results: [],
    });
    navigate("/session");
  };

  const statClass = "flex flex-1 flex-col items-center rounded-xl bg-surface p-3";
  const primary =
    "flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent px-4 text-[1.125rem] font-bold text-accent-fg";

  return (
    <>
      <ScreenHeader
        title="Today"
        action={
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-xl text-muted"
          >
            <Icon name="settings" />
          </Link>
        }
      />

      {data && (
        <>
          <dl className="mb-6 flex gap-2" aria-label="Today in numbers">
            <div className={statClass}>
              <dt className="text-[0.9375rem] text-muted">Streak</dt>
              <dd data-testid="streak" className="text-[1.5rem] font-bold">
                {data.streak} {data.streak === 1 ? "day" : "days"}
              </dd>
            </div>
            <div className={statClass}>
              <dt className="text-[0.9375rem] text-muted">Reviews</dt>
              <dd data-testid="due-count" className="text-[1.5rem] font-bold">
                {data.plan.reviews}
              </dd>
            </div>
            <div className={statClass}>
              <dt className="text-[0.9375rem] text-muted">New</dt>
              <dd data-testid="new-count" className="text-[1.5rem] font-bold">
                {data.plan.newCards}
              </dd>
            </div>
          </dl>

          {data.open ? (
            <button type="button" onClick={() => navigate("/session")} className={primary}>
              Continue ({data.open.index} of {data.open.queue.length} done)
            </button>
          ) : data.doneToday ? (
            <div className="flex flex-col gap-3">
              <p className="rounded-2xl border-l-4 border-ok bg-ok/10 p-4 font-bold text-ok">
                Done for today. Well done!
              </p>
              {data.plan.queue.length > 0 ? (
                <button
                  type="button"
                  onClick={start}
                  className="min-h-12 rounded-xl border-2 border-accent px-4 font-bold text-accent"
                >
                  Review {data.plan.queue.length} more
                </button>
              ) : (
                <p className="text-muted">Nothing more is due today. See you tomorrow.</p>
              )}
            </div>
          ) : data.plan.queue.length > 0 ? (
            <button type="button" onClick={start} className={primary}>
              Start today&apos;s reps ({data.plan.queue.length})
            </button>
          ) : (
            <p className="rounded-2xl bg-surface p-4">
              Nothing to do yet. Turn on the topics you have finished in{" "}
              <Link to="/settings" className="font-bold text-accent underline">
                Settings
              </Link>
              .
            </p>
          )}
        </>
      )}

      <div className="mt-6">
        <PythonStatusBadge />
      </div>
    </>
  );
}
