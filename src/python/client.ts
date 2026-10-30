import type { Checks, FromWorker, RunError, RunMode, ToWorker } from "./protocol.ts";

export type PythonStatus = "loading" | "ready" | "restarting" | "error";

export type RunOptions = {
  mode?: RunMode;
  tests?: string;
  files?: Record<string, string>;
  /** Called with each piece of output as it arrives. */
  onOutput?: (stream: "stdout" | "stderr", text: string) => void;
};

export type RunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  error?: RunError;
  checks?: Checks;
  ms: number;
};

export type WorkerLike = Pick<Worker, "postMessage" | "terminate"> & {
  onmessage: ((event: MessageEvent<FromWorker>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

export const RUN_TIMEOUT_MS = 5_000;
// First load on a slow connection: about 14 MB of downloads, then compiling.
export const INIT_TIMEOUT_MS = 120_000;
export const TIMEOUT_MESSAGE = "Stopped: took longer than 5 s (endless loop?)";

type Job = {
  runId: number;
  message: Extract<ToWorker, { type: "run" }>;
  options: RunOptions;
  resolve: (result: RunResult) => void;
  stdout: string;
  stderr: string;
  startedAt: number;
};

export class PythonClient {
  private worker: WorkerLike | undefined;
  private currentStatus: PythonStatus = "loading";
  private listeners = new Set<() => void>();
  private queue: Job[] = [];
  private current: Job | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private nextRunId = 1;
  private readonly createWorker: () => WorkerLike;

  pythonVersion: string | undefined;

  constructor(createWorker: () => WorkerLike) {
    this.createWorker = createWorker;
  }

  get status(): PythonStatus {
    return this.currentStatus;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getStatus = (): PythonStatus => this.currentStatus;

  /** Starts the worker in the background. Safe to call more than once. */
  start(): void {
    if (!this.worker) this.spawn("loading");
  }

  /** Tries again after a failed start. */
  retry(): void {
    if (this.currentStatus === "error") this.spawn("loading");
  }

  run(code: string, options: RunOptions = {}): Promise<RunResult> {
    this.start();
    if (this.currentStatus === "error") {
      return Promise.resolve(failure({ type: "NotReady", message: "Python could not start." }));
    }
    return new Promise((resolve) => {
      const runId = this.nextRunId++;
      this.queue.push({
        runId,
        message: {
          type: "run",
          runId,
          code,
          mode: options.mode ?? "plain",
          ...(options.tests === undefined ? {} : { tests: options.tests }),
          ...(options.files === undefined ? {} : { files: options.files }),
        },
        options,
        resolve,
        stdout: "",
        stderr: "",
        startedAt: 0,
      });
      this.pump();
    });
  }

  private setStatus(status: PythonStatus): void {
    if (status === this.currentStatus) return;
    this.currentStatus = status;
    for (const listener of this.listeners) listener();
  }

  private spawn(status: "loading" | "restarting"): void {
    this.clearTimer();
    this.worker?.terminate();
    const worker = this.createWorker();
    this.worker = worker;
    this.setStatus(status);
    worker.onmessage = (event) => {
      // A message can still arrive from a worker we have already replaced.
      if (worker === this.worker) this.handle(event.data);
    };
    worker.onerror = () => {
      if (worker === this.worker) this.handleCrash("The Python worker stopped.");
    };
    this.timer = setTimeout(
      () => this.failStart("Python took too long to start."),
      INIT_TIMEOUT_MS,
    );
    worker.postMessage({ type: "init" } satisfies ToWorker);
  }

  private handle(message: FromWorker): void {
    switch (message.type) {
      case "ready":
        this.clearTimer();
        this.pythonVersion = message.pythonVersion;
        this.setStatus("ready");
        this.pump();
        break;
      case "init-error":
        this.failStart(message.message);
        break;
      case "stdout":
      case "stderr": {
        const job = this.current;
        if (job?.runId !== message.runId) return;
        job[message.type] += message.text;
        job.options.onOutput?.(message.type, message.text);
        break;
      }
      case "done": {
        const job = this.current;
        if (job?.runId !== message.runId) return;
        this.finish({
          ok: message.ok,
          stdout: job.stdout,
          stderr: job.stderr,
          ...(message.error ? { error: message.error } : {}),
          ...(message.checks ? { checks: message.checks } : {}),
          ms: message.ms,
        });
        // The runtime itself broke, so this worker can't be used again.
        if (message.error?.type === "Fatal") this.spawn("restarting");
        else this.pump();
        break;
      }
    }
  }

  private pump(): void {
    if (this.currentStatus !== "ready" || this.current) return;
    const job = this.queue.shift();
    if (!job || !this.worker) return;
    this.current = job;
    job.startedAt = performance.now();
    this.timer = setTimeout(() => this.handleTimeout(), RUN_TIMEOUT_MS);
    this.worker.postMessage(job.message);
  }

  private finish(fields: RunResult): void {
    this.clearTimer();
    const job = this.current;
    this.current = undefined;
    job?.resolve(fields);
  }

  private partial(error: RunError): RunResult {
    const job = this.current;
    return {
      ok: false,
      stdout: job?.stdout ?? "",
      stderr: job?.stderr ?? "",
      error,
      ms: job ? performance.now() - job.startedAt : 0,
    };
  }

  // The only way to stop Python here: GitHub Pages can't send the headers that
  // SharedArrayBuffer interrupts need.
  private handleTimeout(): void {
    this.finish(this.partial({ type: "Timeout", message: TIMEOUT_MESSAGE }));
    this.spawn("restarting");
  }

  private handleCrash(message: string): void {
    if (this.current) {
      this.finish(this.partial({ type: "Crash", message }));
      this.spawn("restarting");
    } else {
      this.failStart(message);
    }
  }

  private failStart(message: string): void {
    this.clearTimer();
    this.worker?.terminate();
    this.setStatus("error");
    const waiting = this.queue;
    this.queue = [];
    for (const job of waiting) job.resolve(failure({ type: "NotReady", message }));
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}

function failure(error: RunError): RunResult {
  return { ok: false, stdout: "", stderr: "", error, ms: 0 };
}

export const python = new PythonClient(
  () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }) as WorkerLike,
);
