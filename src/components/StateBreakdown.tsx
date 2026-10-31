type Counts = { new: number; learning: number; review: number; mastered: number };

const PARTS = [
  { key: "new", label: "New", swatch: "bg-surface-2 border border-border" },
  { key: "learning", label: "Learning", swatch: "bg-seq-1" },
  { key: "review", label: "In review", swatch: "bg-seq-2" },
  { key: "mastered", label: "Mastered (3+ weeks)", swatch: "bg-seq-4" },
] as const;

/** One whole (all cards) split by state: a thin bar plus the list with the numbers. */
export default function StateBreakdown({ counts }: { counts: Counts }) {
  const total = PARTS.reduce((n, p) => n + counts[p.key], 0);
  return (
    <div>
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
        {PARTS.filter((p) => counts[p.key] > 0).map((p) => (
          <span key={p.key} className={p.swatch} style={{ flexGrow: counts[p.key] }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1" aria-label={`All ${total} cards by state`}>
        {PARTS.map((p) => (
          <li key={p.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-3 rounded-sm ${p.swatch}`} />
            <span className="flex-1">{p.label}</span>
            <span className="font-bold tabular-nums" data-testid={`state-${p.key}`}>
              {counts[p.key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
