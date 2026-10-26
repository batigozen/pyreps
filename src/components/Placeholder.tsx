type Props = { children: string };

// Temporary body for screens that later phases fill in.
export default function Placeholder({ children }: Props) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-surface p-4 text-muted">
      {children}
    </p>
  );
}
