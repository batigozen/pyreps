import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import BackupSection from "../components/BackupSection.tsx";
import Icon from "../components/Icon.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { content } from "../content/content.ts";
import type { Topic } from "../content/schema.ts";
import { getKv, setTopicUnlocked, updateSettings, type FontSize, type Settings } from "../db/db.ts";
import { DEFAULT_SETTINGS, useSettings } from "../db/useSettings.ts";

const CORE_MODULES = 12;
const TOPIC_ORDER = content.topics.map((topic) => topic.id);
const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

type StepperProps = {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function Stepper({ label, hint, value, min, max, step, onChange }: StepperProps) {
  const button =
    "flex size-11 items-center justify-center rounded-xl border-2 border-border bg-surface text-[1.25rem] font-bold disabled:opacity-40";
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1">
        <p className="font-bold">{label}</p>
        <p className="text-[0.9375rem] text-muted">{hint}</p>
      </div>
      <button
        type="button"
        aria-label={`Fewer: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className={button}
      >
        −
      </button>
      <output aria-label={label} className="w-10 text-center text-[1.25rem] font-bold">
        {value}
      </output>
      <button
        type="button"
        aria-label={`More: ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className={button}
      >
        +
      </button>
    </div>
  );
}

export default function SettingsScreen() {
  const settings = useSettings();
  const persisted = useLiveQuery(() => getKv<boolean>("persisted"));
  const save = (change: Partial<Settings>) => void updateSettings(DEFAULT_SETTINGS, change);

  const topicBox = (topic: Topic, unlocked: Set<string>) => (
    <li key={topic.id}>
      <label className="flex min-h-11 items-center gap-3 py-1">
        <input
          type="checkbox"
          checked={unlocked.has(topic.id)}
          onChange={(event) =>
            void setTopicUnlocked(DEFAULT_SETTINGS, topic.id, event.target.checked, TOPIC_ORDER)
          }
          className="size-6 shrink-0 accent-[var(--accent)]"
        />
        <span>
          <span className="text-muted">{topic.module}. </span>
          {topic.title}
        </span>
      </label>
    </li>
  );

  const section = "mb-6 rounded-2xl bg-surface p-4";

  return (
    <>
      <ScreenHeader
        title="Settings"
        leading={
          <Link
            to="/"
            aria-label="Back to Today"
            className="-ml-2 flex size-11 items-center justify-center rounded-xl text-accent"
          >
            <Icon name="back" />
          </Link>
        }
      />
      {settings && (
        <>
          <section aria-labelledby="daily" className={section}>
            <h2 id="daily" className="mb-1 text-[1.25rem] font-bold">
              Each day
            </h2>
            <Stepper
              label="New cards"
              hint="New cards per day."
              value={settings.newPerDay}
              min={0}
              max={30}
              step={1}
              onChange={(newPerDay) => save({ newPerDay })}
            />
            <Stepper
              label="Max reviews"
              hint="Most reviews per day."
              value={settings.maxReviews}
              min={10}
              max={200}
              step={10}
              onChange={(maxReviews) => save({ maxReviews })}
            />
          </section>

          <section aria-labelledby="topics" className={section}>
            <h2 id="topics" className="mb-1 text-[1.25rem] font-bold">
              Topics I have finished
            </h2>
            <p className="mb-2 text-[0.9375rem] text-muted">
              New cards only come from these topics. Reviews come from all topics.
            </p>
            <h3 className="mt-2 font-bold">Course</h3>
            <ul>
              {content.topics
                .filter((t) => t.module <= CORE_MODULES)
                .map((t) => topicBox(t, new Set(settings.unlocked)))}
            </ul>
            <h3 className="mt-3 font-bold">Extra decks</h3>
            <ul>
              {content.topics
                .filter((t) => t.module > CORE_MODULES)
                .map((t) => topicBox(t, new Set(settings.unlocked)))}
            </ul>
          </section>

          <section aria-labelledby="text-size" className={section}>
            <h2 id="text-size" className="mb-2 text-[1.25rem] font-bold">
              Text size
            </h2>
            <div role="radiogroup" aria-labelledby="text-size" className="flex gap-2">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  role="radio"
                  aria-checked={settings.fontSize === size.value}
                  onClick={() => save({ fontSize: size.value })}
                  className={`min-h-11 flex-1 rounded-xl border-2 px-2 font-bold ${
                    settings.fontSize === size.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border"
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="storage" className={section}>
        <h2 id="storage" className="mb-1 text-[1.25rem] font-bold">
          Your data
        </h2>
        <p data-testid="storage-status">
          {persisted
            ? "Your progress is kept on this phone."
            : "The phone may delete your progress if space runs low. Add PyReps to the Home Screen to keep it safe."}
        </p>
      </section>

      <BackupSection />

      <section aria-labelledby="testing" className={section}>
        <h2 id="testing" className="mb-2 text-[1.25rem] font-bold">
          For testing
        </h2>
        <Link
          to="/gallery"
          className="flex min-h-12 items-center justify-center rounded-xl border-2 border-accent px-4 font-bold text-accent"
        >
          Card gallery
        </Link>
      </section>
    </>
  );
}
