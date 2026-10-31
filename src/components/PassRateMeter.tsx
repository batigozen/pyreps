type Props = { passed: number; total: number; target: number };

/** The 7-day pass rate against its target (PRD: 80% or more). */
export default function PassRateMeter({ passed, total, target }: Props) {
  if (total === 0) {
    return <p className="text-muted">No reviews in the last 7 days yet.</p>;
  }
  const rate = passed / total;
  const onTarget = rate >= target;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span data-testid="pass-rate" className="text-[2rem] leading-none font-bold">
          {pct(rate)}
        </span>
        <span className="text-muted">
          {passed} of {total} reviews passed
        </span>
      </p>
      <div
        role="meter"
        aria-label="7-day pass rate"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(rate * 100)}
        aria-valuetext={`${pct(rate)}, target ${pct(target)}`}
        className="relative mt-3 h-3 rounded-full bg-seq-1/40"
      >
        <div className="h-full rounded-full bg-seq-3" style={{ width: pct(rate) }} />
        <span
          aria-hidden="true"
          className="absolute -top-1 h-5 w-0.5 bg-fg"
          style={{ left: pct(target) }}
        />
      </div>
      <p className="mt-2 text-[0.9375rem]">
        <span className={`font-bold ${onTarget ? "text-ok" : "text-bad"}`}>
          {onTarget ? "✓ On target" : "! Below target"}
        </span>{" "}
        <span className="text-muted">Target: {pct(target)} or more.</span>
      </p>
    </div>
  );
}
