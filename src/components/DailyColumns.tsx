import { useState } from "react";
import { dayLabel } from "../srs/stats.ts";
import ShowNumbers from "./ShowNumbers.tsx";

type Props = { days: { day: string; count: number }[] };

const HEIGHT = 120;

/** Cards answered on each of the last 7 days. Tap a column for its number. */
export default function DailyColumns({ days }: Props) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const [selected, setSelected] = useState(days.at(-1)?.day);
  const chosen = days.find((d) => d.day === selected);

  return (
    <div>
      <div className="relative border-b border-border" style={{ height: HEIGHT + 22 }}>
        <div className="absolute inset-0 grid grid-cols-7 items-end">
          {days.map((d) => {
            const h = d.count === 0 ? 0 : Math.max(4, (d.count / max) * HEIGHT);
            const isMax = d.count === max && d.count > 0;
            return (
              <button
                key={d.day}
                type="button"
                aria-label={`${dayLabel(d.day)}: ${d.count} cards`}
                aria-pressed={d.day === selected}
                onClick={() => setSelected(d.day)}
                className={`flex h-full min-h-11 flex-col items-center justify-end rounded-md ${
                  d.day === selected ? "bg-surface-2" : ""
                }`}
              >
                {isMax && (
                  <span
                    className="mb-1 text-[0.8125rem] text-muted tabular-nums"
                    aria-hidden="true"
                  >
                    {d.count}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="w-6 rounded-t-[4px] bg-seq-3"
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div
        className="mt-1 grid grid-cols-7 text-center text-[0.8125rem] text-muted"
        aria-hidden="true"
      >
        {days.map((d) => (
          <span key={d.day}>{dayLabel(d.day).slice(0, 2)}</span>
        ))}
      </div>
      <p className="mt-2 text-[0.9375rem]" aria-live="polite">
        {chosen && (
          <>
            <span className="font-bold">{chosen.count} cards</span>{" "}
            <span className="text-muted">on {dayLabel(chosen.day)}</span>
          </>
        )}
      </p>
      <ShowNumbers
        caption="Cards answered on each of the last 7 days"
        head={["Day", "Cards"]}
        rows={[...days].reverse().map((d) => [dayLabel(d.day), String(d.count)])}
      />
    </div>
  );
}
