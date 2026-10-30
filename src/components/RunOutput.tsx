import type { RunResult } from "../python/client.ts";

type Props = {
  output: string;
  result?: RunResult | undefined;
  /** Shown when the run ended without output or errors. */
  emptyText?: string;
};

/** Output of a Python run: printed text, then the error or failed checks, in plain words. */
export default function RunOutput({ output, result, emptyText = "No output." }: Props) {
  const failures = result?.checks && !result.checks.passed ? result.checks.failures : [];
  return (
    <div
      data-testid="python-output"
      aria-live="polite"
      className="min-h-20 rounded-xl border border-border bg-surface-2 p-3"
    >
      {output && <pre className="overflow-x-auto text-[0.9375rem]">{output}</pre>}
      {result?.error && (
        <pre className="overflow-x-auto text-[0.9375rem] text-bad">
          {result.error.traceback || result.error.message}
        </pre>
      )}
      {failures.length > 0 && (
        <div className="mt-2 text-bad">
          <p className="font-bold">
            {failures.length === 1 ? "1 check failed:" : `${failures.length} checks failed:`}
          </p>
          <ul className="list-disc pl-5">
            {failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      )}
      {result?.ok && !output && failures.length === 0 && (
        <p className="text-muted">{result.checks?.passed ? "All checks passed." : emptyText}</p>
      )}
    </div>
  );
}
