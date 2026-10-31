import { useState } from "react";
import CodeEditor from "../components/CodeEditor.tsx";
import ExportButton from "../components/ExportButton.tsx";
import PythonStatusBadge from "../components/PythonStatusBadge.tsx";
import RunOutput from "../components/RunOutput.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import Sheet from "../components/Sheet.tsx";
import { useDraft } from "../components/useDraft.ts";
import { python, type RunResult } from "../python/client.ts";
import { usePythonStatus } from "../python/usePythonStatus.ts";

const START_CODE = `from voicelab import load_cdrs

rows = load_cdrs()
print(len(rows), "calls")
`;

type Sample = { file: string; about: string; snippet: string };

const SAMPLES: Sample[] = [
  {
    file: "data/cdrs.csv",
    about: "48 call records: call_id, start, caller, callee, trunk, duration_s, sip_code.",
    snippet:
      'from voicelab import load_cdrs\nrows = load_cdrs()\nprint(rows[0]["trunk"], rows[0]["sip_code"])',
  },
  {
    file: "data/sip.log",
    about: "18 SBC log lines: INVITEs with setup_ms, a keepalive and one cut-off line.",
    snippet: "from voicelab import read_log\nfor line in read_log()[:3]:\n    print(line[:60])",
  },
  {
    file: "data/pods.json",
    about: "kubectl get pods -o json: 5 pods, one Pending and one that keeps restarting.",
    snippet:
      'import json\nfrom voicelab import fake_kubectl\npods = json.loads(fake_kubectl())["items"]\nprint([p["metadata"]["name"] for p in pods])',
  },
  {
    file: "data/prom.json",
    about: "A Prometheus query reply: the SIP failure ratio per trunk.",
    snippet:
      'import json\nfrom voicelab import fake_prometheus\nreply = json.loads(fake_prometheus("q"))\nprint(reply["data"]["result"][0])',
  },
];

export default function PlaygroundScreen() {
  const status = usePythonStatus();
  const [code, setCode] = useDraft("playground", START_CODE);
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<RunResult>();
  const [running, setRunning] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);

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

  const insert = (snippet: string) => {
    if (code === null) return;
    const base = code.trimEnd();
    setCode(`${base ? `${base}\n\n` : ""}${snippet}\n`);
    setSamplesOpen(false);
  };

  const canRun = status === "ready" && !running && code !== null;

  return (
    <>
      <ScreenHeader
        title="Playground"
        action={
          <button
            type="button"
            onClick={() => setSamplesOpen(true)}
            className="min-h-11 rounded-xl border-2 border-accent px-3 font-bold text-accent"
          >
            Sample data
          </button>
        }
      />
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

      {code !== null && (
        <div className="mt-6">
          <ExportButton scriptName="playground.py" code={code} />
        </div>
      )}

      <Sheet open={samplesOpen} title="Sample data" onClose={() => setSamplesOpen(false)}>
        <p className="mb-3 text-[0.9375rem] text-muted">
          These files are ready in every run. The voicelab helpers stand in for kubectl and
          Prometheus, so everything works offline.
        </p>
        <ul className="flex flex-col gap-3">
          {SAMPLES.map((sample) => (
            <li key={sample.file} className="rounded-xl border border-border bg-surface p-3">
              <p className="font-mono text-[0.9375rem] font-bold">{sample.file}</p>
              <p className="mb-2 text-[0.9375rem]">{sample.about}</p>
              <button
                type="button"
                onClick={() => insert(sample.snippet)}
                aria-label={`Insert example for ${sample.file}`}
                className="min-h-11 rounded-lg bg-accent px-3 font-bold text-accent-fg"
              >
                Insert example
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
