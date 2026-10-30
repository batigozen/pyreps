import { useState } from "react";
import CodeEditor from "../components/CodeEditor.tsx";
import PythonStatusBadge from "../components/PythonStatusBadge.tsx";
import RunOutput from "../components/RunOutput.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { useDraft } from "../components/useDraft.ts";
import { python, type RunResult } from "../python/client.ts";
import { usePythonStatus } from "../python/usePythonStatus.ts";

const START_CODE = "print(sum(range(10)))";

// Temporary screen to prove Python works on the phone. Phase 6 makes it the real Playground.
export default function PlaygroundScreen() {
  const status = usePythonStatus();
  const [code, setCode] = useDraft("playground", START_CODE);
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<RunResult>();
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (code === null) return;
    setRunning(true);
    setOutput("");
    setResult(undefined);
    const finished = await python.run(code, {
      onOutput: (_stream, text) => setOutput((previous) => previous + text),
    });
    setResult(finished);
    setRunning(false);
  };

  const canRun = status === "ready" && !running && code !== null;

  return (
    <>
      <ScreenHeader title="Playground" />
      <div className="mb-3">
        <PythonStatusBadge />
      </div>

      {code === null ? (
        <p className="text-muted">Loading your code…</p>
      ) : (
        <CodeEditor id="playground-code" label="Code" value={code} onChange={setCode} />
      )}

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
      <RunOutput output={output} result={result} />
    </>
  );
}
