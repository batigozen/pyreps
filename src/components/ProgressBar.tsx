type Props = { value: number; max: number; label: string; tone?: "accent" | "ok" };

export default function ProgressBar({ value, max, label, tone = "accent" }: Props) {
  const share = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className={`h-full rounded-full ${tone === "ok" ? "bg-ok" : "bg-accent"} transition-[width]`}
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
