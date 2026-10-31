type Props = { label: string; value: string; detail?: string; testId?: string };

export default function StatTile({ label, value, detail, testId }: Props) {
  return (
    <div className="flex flex-col rounded-xl bg-surface p-3">
      <p className="text-[0.9375rem] text-muted">{label}</p>
      <p data-testid={testId} className="text-[1.5rem] leading-tight font-bold">
        {value}
      </p>
      {detail && <p className="text-[0.875rem] text-muted">{detail}</p>}
    </div>
  );
}
