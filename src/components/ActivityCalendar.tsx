import { useState } from "react";
import { dayLabel, heatLevel, type DayCell } from "../srs/stats.ts";
import ShowNumbers from "./ShowNumbers.tsx";

const LEVEL_CLASS = ["bg-surface-2", "bg-seq-1", "bg-seq-2", "bg-seq-3", "bg-seq-4"] as const;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const cardsText = (n: number) => (n === 1 ? "1 card" : `${n} cards`);

type Props = { weeks: DayCell[][]; today: string };

/** 8 weeks of practice: a row per week, a column per weekday. Tap a day for its number. */
export default function ActivityCalendar({ weeks, today }: Props) {
  const max = Math.max(0, ...weeks.flat().map((cell) => cell.count));
  const [selected, setSelected] = useState(today);
  const chosen = weeks.flat().find((cell) => cell.day === selected);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-center text-[0.875rem] text-muted">
            {d}
          </span>
        ))}
      </div>
      <div
        role="group"
        aria-label="Cards answered per day, last 8 weeks"
        className="mt-1 flex flex-col gap-1"
      >
        {weeks.map((week) => (
          <div key={week[0]?.day} className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <button
                key={cell.day}
                type="button"
                disabled={cell.future}
                aria-pressed={cell.day === selected}
                aria-label={`${dayLabel(cell.day)}: ${cardsText(cell.count)}`}
                onClick={() => setSelected(cell.day)}
                className={`h-11 rounded-md ${
                  cell.future ? "bg-transparent" : LEVEL_CLASS[heatLevel(cell.count, max)]
                } ${cell.day === selected ? "outline-2 outline-offset-1 outline-fg" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[0.9375rem]" aria-live="polite" data-testid="calendar-readout">
        {chosen && (
          <>
            <span className="font-bold">{cardsText(chosen.count)}</span>{" "}
            <span className="text-muted">on {dayLabel(chosen.day)}</span>
          </>
        )}
      </p>
      <div className="mt-1 flex items-center gap-1 text-[0.875rem] text-muted" aria-hidden="true">
        <span>Less</span>
        {LEVEL_CLASS.map((c) => (
          <span key={c} className={`size-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
      <ShowNumbers
        caption="Cards answered per day"
        head={["Day", "Cards"]}
        rows={weeks
          .flat()
          .filter((cell) => !cell.future && cell.count > 0)
          .reverse()
          .map((cell) => [dayLabel(cell.day), String(cell.count)])}
      />
    </div>
  );
}
