import RichText from "../components/RichText.tsx";

type Props = {
  label: string;
  options: readonly string[];
  selected: number | null;
  onSelect: (index: number) => void;
  /** Options already tried and wrong. */
  ruledOut?: ReadonlySet<number>;
  /** After the card ends: the right option, to mark it. */
  correct?: number | null;
  done?: boolean;
  mono?: boolean;
  /** Short options side by side, like chips. */
  chips?: boolean;
};

export default function ChoiceList({
  label,
  options,
  selected,
  onSelect,
  ruledOut,
  correct = null,
  done = false,
  mono = false,
  chips = false,
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={chips ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}
    >
      {options.map((option, i) => {
        const isRight = done && i === correct;
        const isWrong = (done && i === selected && i !== correct) || ruledOut?.has(i);
        const state = isRight
          ? "border-ok bg-ok/10"
          : isWrong
            ? "border-bad bg-bad/10 line-through decoration-bad/70"
            : selected === i
              ? "border-accent bg-accent/10 outline-2 -outline-offset-2 outline-accent"
              : "border-border bg-surface";
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === i}
            disabled={done || ruledOut?.has(i)}
            onClick={() => onSelect(i)}
            className={`flex min-h-12 items-center gap-3 rounded-xl border-2 px-4 py-2 text-left ${
              chips ? "min-w-12 justify-center" : ""
            } ${state}`}
          >
            <span
              className={`${chips ? "" : "flex-1"} ${mono ? "font-mono text-[0.9375rem] whitespace-pre-wrap" : ""}`}
            >
              {mono ? option : <RichText text={option} />}
            </span>
            {isRight && <span className="sr-only">Right answer</span>}
            {isWrong && <span className="sr-only">Wrong</span>}
          </button>
        );
      })}
    </div>
  );
}
