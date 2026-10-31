import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import CodeEditor from "../components/CodeEditor.tsx";
import CodeView from "../components/CodeView.tsx";
import ExportButton from "../components/ExportButton.tsx";
import Icon from "../components/Icon.tsx";
import PythonStatusBadge from "../components/PythonStatusBadge.tsx";
import RichText from "../components/RichText.tsx";
import RunOutput from "../components/RunOutput.tsx";
import Sheet from "../components/Sheet.tsx";
import { content } from "../content/content.ts";
import type { Project } from "../content/schema.ts";
import { getProject, resetProject, saveProject, saveProjectCode } from "../db/db.ts";
import { python, type RunResult } from "../python/client.ts";
import { usePythonStatus } from "../python/usePythonStatus.ts";

const SAVE_DELAY_MS = 400;

export default function ProjectScreen() {
  const { projectId } = useParams();
  const project = content.projects.find((p) => p.id === projectId);
  const row = useLiveQuery(async () => (await getProject(projectId ?? "")) ?? null, [projectId]);
  if (!project) return <Navigate to="/projects" replace />;
  if (row === undefined) return <p className="text-muted">Loading…</p>;
  return (
    <ProjectView
      key={`${project.id}-${row?.stepIndex ?? 0}-${row?.finished ?? false}`}
      project={project}
      stepIndex={row?.stepIndex ?? 0}
      finished={row?.finished ?? false}
      savedCode={row?.code}
    />
  );
}

type ViewProps = {
  project: Project;
  stepIndex: number;
  finished: boolean;
  savedCode: string | undefined;
};

function ProjectView({ project, stepIndex, finished, savedCode }: ViewProps) {
  const status = usePythonStatus();
  const step = project.steps[stepIndex] ?? project.steps[0];
  const total = project.steps.length;
  const scriptName = `${project.id}.py`;
  const fileNames = Object.keys(project.files);

  const [code, setCode] = useState(savedCode ?? step?.starter ?? "");
  const [tab, setTab] = useState<string>(scriptName);
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<RunResult>();
  const [running, setRunning] = useState<"run" | "check" | null>(null);
  const [passed, setPassed] = useState(finished);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Save the code while typing, a moment after the last key.
  useEffect(() => {
    if (code === (savedCode ?? step?.starter)) return;
    const timer = setTimeout(() => {
      void saveProjectCode(project.id, stepIndex, code);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code, savedCode, step, project.id, stepIndex]);

  useEffect(() => {
    if (passed && !finished) bannerRef.current?.focus();
  }, [passed, finished]);

  if (!step) return null;

  const execute = async (mode: "run" | "check") => {
    setRunning(mode);
    setOutput("");
    setResult(undefined);
    const done = await python.run(code, {
      mode: mode === "check" ? "test" : "plain",
      tests: mode === "check" ? step.tests : undefined,
      files: project.files,
      onOutput: (_stream, text) => setOutput((previous) => previous + text),
    });
    setResult(done);
    setRunning(null);
    if (mode === "check" && done.ok && done.checks?.passed) {
      setPassed(true);
      await saveProjectCode(project.id, stepIndex, code);
    }
  };

  const nextStep = async () => {
    const next = project.steps[stepIndex + 1];
    if (next) {
      // The next step starts from a known-good version of everything so far.
      await saveProject({
        projectId: project.id,
        stepIndex: stepIndex + 1,
        code: next.starter,
        finished: false,
      });
    } else {
      await saveProject({ projectId: project.id, stepIndex, code, finished: true });
    }
  };

  const busy = running !== null || status !== "ready";
  const isLast = stepIndex === total - 1;

  return (
    <article aria-labelledby="project-title" className="flex flex-col gap-4">
      <header className="flex min-h-11 items-center gap-2">
        <Link
          to="/projects"
          aria-label="All projects"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-accent"
        >
          <Icon name="back" />
        </Link>
        <div className="flex-1">
          <h1 id="project-title" className="text-[1.5rem] leading-tight font-bold">
            {project.title}
          </h1>
          <p className="text-[0.9375rem] text-muted" data-testid="project-step">
            {finished ? "Finished" : `Step ${stepIndex + 1} of ${total}`}
          </p>
        </div>
      </header>

      {finished ? (
        <p className="rounded-xl border-l-4 border-ok bg-ok/10 p-4 font-bold text-ok">
          Project finished. Export it and run it on your phone.
        </p>
      ) : (
        <h2 className="text-[1.25rem] leading-snug font-bold">
          <RichText text={step.prompt} />
        </h2>
      )}

      {fileNames.length > 0 && (
        <div role="tablist" aria-label="Files" className="flex gap-2 overflow-x-auto">
          {[scriptName, ...fileNames].map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={`min-h-11 shrink-0 rounded-lg border-2 px-3 font-mono text-[0.9375rem] ${
                tab === name ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {tab === scriptName ? (
        <CodeEditor id={`${project.id}-code`} label={scriptName} value={code} onChange={setCode} />
      ) : (
        <div>
          <p className="mb-1 text-[0.9375rem] text-muted">
            Read only. Your script opens it as project/{tab}.
          </p>
          <CodeView code={project.files[tab] ?? ""} label={tab} />
        </div>
      )}

      {status !== "ready" && <PythonStatusBadge />}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void execute("run")}
          disabled={busy}
          className="min-h-12 flex-1 rounded-xl border-2 border-accent px-4 font-bold text-accent disabled:opacity-50"
        >
          {running === "run" ? "Running…" : "Run"}
        </button>
        {!finished && (
          <button
            type="button"
            onClick={() => void execute("check")}
            disabled={busy}
            className="min-h-12 flex-1 rounded-xl bg-accent px-4 font-bold text-accent-fg disabled:opacity-50"
          >
            {running === "check" ? "Checking…" : "Check"}
          </button>
        )}
      </div>

      {(running || result) && <RunOutput output={output} result={result} />}

      <div ref={bannerRef} tabIndex={-1} role="status" className="outline-none">
        {passed && !finished && (
          <p className="rounded-xl border-l-4 border-ok bg-ok/10 px-4 py-3 font-bold text-ok">
            Step {stepIndex + 1} done. All checks passed.
          </p>
        )}
      </div>

      {passed && !finished && (
        <>
          <section aria-label="Why" className="rounded-xl bg-surface-2 p-4">
            <h3 className="mb-1 font-bold">Why</h3>
            <p>
              <RichText text={step.explain} />
            </p>
          </section>
          <button
            type="button"
            onClick={() => void nextStep()}
            className="min-h-12 rounded-xl bg-accent px-4 font-bold text-accent-fg"
          >
            {isLast ? "Finish project" : "Next step"}
          </button>
          {!isLast && (
            <p className="text-[0.9375rem] text-muted">
              The next step starts from a clean version of your script so far.
            </p>
          )}
        </>
      )}

      {!passed && !finished && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowHint(true)}
            disabled={showHint}
            className="min-h-12 flex-1 rounded-xl px-4 font-bold text-accent disabled:opacity-50"
          >
            Hint
          </button>
          <button
            type="button"
            onClick={() => setShowSolution(true)}
            disabled={showSolution}
            className="min-h-12 flex-1 rounded-xl px-4 font-bold text-accent disabled:opacity-50"
          >
            Show solution
          </button>
        </div>
      )}

      {showHint && !passed && (
        <section aria-label="Hint" className="rounded-xl border-l-4 border-accent bg-accent/10 p-4">
          <h3 className="mb-1 font-bold">Hint</h3>
          <p>
            <RichText text={step.hint} />
          </p>
        </section>
      )}

      {showSolution && !passed && (
        <section aria-label="Solution" className="flex flex-col gap-2">
          <h3 className="font-bold">Solution</h3>
          <CodeView code={step.solution} label="Solution" />
          <button
            type="button"
            onClick={() => {
              setCode(step.solution);
              setTab(scriptName);
            }}
            className="min-h-12 rounded-xl border-2 border-accent px-4 font-bold text-accent"
          >
            Use this code
          </button>
        </section>
      )}

      <ExportButton scriptName={scriptName} code={code} />

      <button
        type="button"
        onClick={() => setConfirmReset(true)}
        className="min-h-11 self-start rounded-lg px-2 text-[0.9375rem] text-muted underline"
      >
        Start this project again
      </button>

      <Sheet open={confirmReset} title="Start again?" onClose={() => setConfirmReset(false)}>
        <p className="mb-4">Your code for this project will be deleted. You start at step 1.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className="min-h-12 flex-1 rounded-xl border-2 border-border px-4 font-bold"
          >
            Keep my code
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmReset(false);
              void resetProject(project.id);
            }}
            className="min-h-12 flex-1 rounded-xl bg-bad px-4 font-bold text-bg"
          >
            Start again
          </button>
        </div>
      </Sheet>
    </article>
  );
}
