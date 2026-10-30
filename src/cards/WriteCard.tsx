import { useEffect, useRef, useState } from "react";
import type { WriteCard as WriteCardData } from "../content/schema.ts";
import CodeEditor from "../components/CodeEditor.tsx";
import CodeView from "../components/CodeView.tsx";
import PythonStatusBadge from "../components/PythonStatusBadge.tsx";
import RichText from "../components/RichText.tsx";
import RunOutput from "../components/RunOutput.tsx";
import { useDraft } from "../components/useDraft.ts";
import { python, type RunResult } from "../python/client.ts";
import { usePythonStatus } from "../python/usePythonStatus.ts";
import type { Result } from "./outcome.ts";
import type { CardProps } from "./types.ts";
import { useActiveTime } from "./useActiveTime.ts";

// Python errors that came from the user's code count as a failed check.
// Errors from the runtime itself (not ready, crashed) don't.
const RUNTIME_ERRORS = new Set(["NotReady", "Crash", "Fatal"]);

const RESULT_TEXT: Record<Result, string> = {
  "first-try": "Right! All checks passed.",
  retry: "All checks passed.",
  wrong: "All checks passed. It took a few tries; this card comes back soon.",
  shown: "Here is a solution.",
};

/**
 * A failed Check doesn't end the card: a typo shouldn't. It changes the result, like the
 * retry rule in ARCHITECTURE.md: 0 fails and no hint = first try, 1 fail or the hint = retry,
 * 2 or more fails = wrong.
 */
function resultFor(failedChecks: number, hintUsed: boolean): Result {
  if (failedChecks >= 2) return "wrong";
  if (failedChecks === 1 || hintUsed) return "retry";
  return "first-try";
}

export default function WriteCard({ card, onDone, onNext, extra }: CardProps<WriteCardData>) {
  const status = usePythonStatus();
  const [code, setCode] = useDraft(card.id, card.starter);
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<RunResult>();
  const [running, setRunning] = useState<"run" | "check" | null>(null);
  const [failedChecks, setFailedChecks] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [final, setFinal] = useState<Result | null>(null);
  const elapsed = useActiveTime();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (final === null) return;
    bannerRef.current?.focus();
    bannerRef.current?.scrollIntoView({ block: "nearest" });
  }, [final]);

  const finish = (value: Result) => {
    setFinal(value);
    onDone({ cardId: card.id, result: value, ms: elapsed() });
  };

  const execute = async (mode: "run" | "check") => {
    if (code === null) return;
    setRunning(mode);
    setOutput("");
    setResult(undefined);
    const finished = await python.run(code, {
      mode: mode === "check" ? "test" : "plain",
      tests: mode === "check" ? card.tests : undefined,
      onOutput: (_stream, text) => setOutput((previous) => previous + text),
    });
    setResult(finished);
    setRunning(null);
    if (mode !== "check" || final !== null) return;
    if (finished.ok && finished.checks?.passed) finish(resultFor(failedChecks, hintUsed));
    else if (!RUNTIME_ERRORS.has(finished.error?.type ?? "")) setFailedChecks((n) => n + 1);
  };

  const done = final !== null;
  const busy = running !== null || status !== "ready" || code === null;
  const primary = "min-h-12 flex-1 rounded-xl px-4 font-bold disabled:opacity-50";
  const secondary = "min-h-12 rounded-xl px-4 font-bold text-accent";
  const passed = final === "first-try" || final === "retry" || final === "wrong";

  return (
    <article aria-labelledby={`${card.id}-prompt`} className="flex flex-col gap-4">
      <header>
        <p className="text-[0.9375rem] text-muted">Write code</p>
        <h2 id={`${card.id}-prompt`} className="text-[1.25rem] leading-snug font-bold">
          <RichText text={card.prompt} />
        </h2>
      </header>

      {code === null ? (
        <p className="text-muted">Loading your code…</p>
      ) : (
        <CodeEditor id={`${card.id}-code`} label="Your code" value={code} onChange={setCode} />
      )}

      {status !== "ready" && <PythonStatusBadge />}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void execute("run")}
          disabled={busy}
          className={`${primary} border-2 border-accent text-accent`}
        >
          {running === "run" ? "Running…" : "Run"}
        </button>
        <button
          type="button"
          onClick={() => void execute("check")}
          disabled={busy}
          className={`${primary} bg-accent text-accent-fg`}
        >
          {running === "check" ? "Checking…" : "Check"}
        </button>
      </div>

      {(running || result) && <RunOutput output={output} result={result} />}

      {!done && failedChecks > 0 && (
        <p className="text-[0.9375rem] text-muted">
          Failed checks so far: {failedChecks}. Fix the code and check again.
        </p>
      )}

      <div ref={bannerRef} tabIndex={-1} role="status" className="outline-none">
        {final && (
          <p
            className={`rounded-xl border-l-4 px-4 py-3 font-bold ${
              passed ? "border-ok bg-ok/10 text-ok" : "border-accent bg-accent/10"
            }`}
          >
            {RESULT_TEXT[final]}
          </p>
        )}
      </div>

      {done && extra}

      {hintUsed && (
        <section aria-label="Hint" className="rounded-xl border-l-4 border-accent bg-accent/10 p-4">
          <h3 className="mb-1 font-bold">Hint</h3>
          <p>
            <RichText text={card.hint} />
          </p>
        </section>
      )}

      {final === "shown" && (
        <section aria-label="Solution">
          <h3 className="mb-1 font-bold">Solution</h3>
          <CodeView code={card.solution} label="Solution" />
        </section>
      )}

      {done && (
        <section aria-label="Why" className="rounded-xl bg-surface-2 p-4">
          <h3 className="mb-1 font-bold">Why</h3>
          <p>
            <RichText text={card.explain} />
          </p>
        </section>
      )}

      <div className="flex flex-col gap-2">
        {done ? (
          <button
            type="button"
            onClick={onNext}
            className="min-h-12 rounded-xl bg-accent px-4 font-bold text-accent-fg"
          >
            Next
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHintUsed(true)}
              disabled={hintUsed}
              className={`${secondary} flex-1 disabled:opacity-50`}
            >
              Hint
            </button>
            <button type="button" onClick={() => finish("shown")} className={`${secondary} flex-1`}>
              Show solution
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
