// Messages between the main thread and the Pyodide worker. See ARCHITECTURE.md.

export type RunMode = "plain" | "test";

export type RunError = {
  type: string;
  message: string;
  traceback?: string;
  line?: number | null;
};

export type Checks = { passed: boolean; failures: string[] };

export type ToWorker =
  | { type: "init" }
  | {
      type: "run";
      runId: number;
      code: string;
      mode: RunMode;
      tests?: string;
      files?: Record<string, string>;
    };

export type FromWorker =
  | { type: "ready"; pythonVersion: string }
  | { type: "init-error"; message: string }
  | { type: "stdout" | "stderr"; runId: number; text: string }
  | { type: "done"; runId: number; ok: boolean; error?: RunError; checks?: Checks; ms: number };
