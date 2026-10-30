import { useState } from "react";
import PythonStatusBadge from "../components/PythonStatusBadge.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { python, type RunResult } from "../python/client.ts";
import { usePythonStatus } from "../python/usePythonStatus.ts";

// Temporary screen to prove Python works on the phone. Phase 6 replaces it.
export default function PlaygroundScreen() {
  const status = usePythonStatus();
  const [code, setCode] = useState("print(sum(range(10)))");
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<RunResult>();
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setOutput("");
    setResult(undefined);
    const finished = await python.run(code, {
      onOutput: (_stream, text) => setOutput((previous) => previous + text),
    });
    setResult(finished);
    setRunning(false);
  };

  const canRun = status === "ready" && !running;

  return (
    <>
      <ScreenHeader title="Playground" />
      <div className="mb-3">
        <PythonStatusBadge />
      </div>

      <label htmlFor="playground-code" className="mb-1 block font-bold">
        Code
      </label>
      <textarea
        id="playground-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        wrap="off"
        rows={8}
        className="w-full resize-y overflow-x-auto rounded-xl border border-border bg-surface p-3 text-base"
      />

      {status === "error" ? (
        <button
          type="button"
          onClick={() => python.retry()}
          className="mt-3 min-h-12 w-full rounded-xl bg-accent px-4 font-bold text-accent-fg"
        >
          Try again
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void run()}
          disabled={!canRun}
          className="mt-3 min-h-12 w-full rounded-xl bg-accent px-4 font-bold text-accent-fg disabled:opacity-50"
        >
          {running ? "Running…" : "Run"}
        </button>
      )}

      <h2 className="mt-4 mb-1 font-bold">Output</h2>
      <div
        data-testid="python-output"
        aria-live="polite"
        className="min-h-20 rounded-xl border border-border bg-surface-2 p-3"
      >
        {output && <pre className="overflow-x-auto text-[15px]">{output}</pre>}
        {result?.error && (
          <pre className="overflow-x-auto text-[15px] text-bad">
            {result.error.traceback || result.error.message}
          </pre>
        )}
        {result?.ok && !output && <p className="text-muted">No output.</p>}
      </div>
    </>
  );
}
