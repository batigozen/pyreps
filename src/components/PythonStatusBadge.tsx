import { usePythonStatus } from "../python/usePythonStatus.ts";
import type { PythonStatus } from "../python/client.ts";

const LABELS: Record<PythonStatus, string> = {
  loading: "Python is loading…",
  ready: "Python ready",
  restarting: "Python is restarting…",
  error: "Python could not start",
};

const DOT: Record<PythonStatus, string> = {
  loading: "bg-muted",
  ready: "bg-ok",
  restarting: "bg-muted",
  error: "bg-bad",
};

export default function PythonStatusBadge() {
  const status = usePythonStatus();
  return (
    <p className="flex items-center gap-2 text-[0.9375rem] text-muted">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT[status]}`} />
      <span data-testid="python-status">{LABELS[status]}</span>
    </p>
  );
}
