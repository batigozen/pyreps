/// <reference lib="webworker" />
import type { PyodideAPI } from "pyodide";
import type { FromWorker, ToWorker } from "./protocol.ts";
import { setupPython, type Runner } from "./setup.ts";

declare const self: DedicatedWorkerGlobalScope;

// The first output goes out at once: the next write may never come if the code then hangs.
// After that it is batched, so that a fast print loop doesn't send thousands of messages.
const SEND_AT_ONCE_CHARS = 16_000;
const FLUSH_MS = 50;
const FLUSH_CHARS = 4096;
// An endless print loop must not flood the UI. The 5 s timeout stops the loop itself.
const MAX_OUTPUT_CHARS = 200_000;

// Browser APIs that user code could reach through Pyodide's `js` module. The page's CSP
// doesn't cover this worker: a same-origin worker uses its own response headers, and
// GitHub Pages sends none. So we remove them once Pyodide has finished loading.
// This is a lock made in JavaScript, not one the browser enforces.
const BLOCKED_APIS = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "WebTransport",
  "EventSource",
  "indexedDB",
  "caches",
  "cookieStore",
  "BroadcastChannel",
  "Worker",
  "SharedWorker",
  "importScripts",
  "navigator",
];

function lockWorkerScope(): void {
  for (let scope: object | null = self; scope; scope = Object.getPrototypeOf(scope) as object) {
    for (const name of BLOCKED_APIS) Reflect.deleteProperty(scope, name);
  }
  blockCodeFromText();
}

// Without this, js.eval("import('https://...')") would still reach the network.
function blockCodeFromText(): void {
  const blocked = () => {
    throw new EvalError("Blocked in PyReps");
  };
  Reflect.deleteProperty(self, "eval");
  // Pyodide still needs `x instanceof Function`, so the name stays but can't build code.
  const blockedFunction = function () {
    blocked();
  };
  blockedFunction.prototype = Function.prototype;
  Object.defineProperty(self, "Function", { value: blockedFunction });
  const functionKinds = [
    function () {},
    async function () {},
    function* () {},
    async function* () {},
  ];
  for (const kind of functionKinds) {
    Object.defineProperty(Object.getPrototypeOf(kind), "constructor", { value: blocked });
  }
  // setTimeout and setInterval also accept code as text. asyncio needs the normal form.
  for (const name of ["setTimeout", "setInterval"] as const) {
    const original = self[name].bind(self);
    Object.defineProperty(self, name, {
      value: (handler: unknown, ...rest: never[]) => {
        if (typeof handler !== "function") blocked();
        return original(handler as () => void, ...rest);
      },
    });
  }
}

const post = (message: FromWorker) => self.postMessage(message);

let runner: Runner | undefined;
let runId = 0;

class OutputStream {
  private decoder = new TextDecoder();
  private buffer = "";
  private lastFlush = 0;
  private sent = 0;
  private readonly type: "stdout" | "stderr";

  constructor(type: "stdout" | "stderr") {
    this.type = type;
  }

  reset() {
    this.decoder = new TextDecoder();
    this.buffer = "";
    this.sent = 0;
    this.lastFlush = performance.now();
  }

  // Python blocks this thread while it runs, so timers can't flush. We flush from the write.
  write = (bytes: Uint8Array): number => {
    if (this.sent < MAX_OUTPUT_CHARS) {
      this.buffer += this.decoder.decode(bytes, { stream: true });
      const now = performance.now();
      if (
        this.sent < SEND_AT_ONCE_CHARS ||
        this.buffer.length >= FLUSH_CHARS ||
        now - this.lastFlush >= FLUSH_MS
      ) {
        this.flush();
      }
    }
    return bytes.length;
  };

  flush() {
    if (this.buffer) {
      let text = this.buffer;
      const room = MAX_OUTPUT_CHARS - this.sent;
      if (text.length > room) text = `${text.slice(0, room)}\n[Output cut: too much text]\n`;
      this.sent += Math.min(this.buffer.length, room);
      post({ type: this.type, runId, text });
      this.buffer = "";
    }
    this.lastFlush = performance.now();
  }
}

const stdout = new OutputStream("stdout");
const stderr = new OutputStream("stderr");

async function init(): Promise<void> {
  try {
    const indexURL = `${import.meta.env.BASE_URL}pyodide/`;
    const { loadPyodide } = (await import(
      /* @vite-ignore */ `${indexURL}pyodide.mjs`
    )) as typeof import("pyodide");
    const pyodide: PyodideAPI = await loadPyodide({ indexURL });
    pyodide.setStdout({ write: stdout.write });
    pyodide.setStderr({ write: stderr.write });
    pyodide.setStdin({ error: true });
    runner = setupPython(pyodide);
    lockWorkerScope();
    const pythonVersion = pyodide.runPython("import sys; sys.version.split()[0]") as string;
    post({ type: "ready", pythonVersion });
  } catch (err) {
    console.error("Python could not start:", err);
    post({ type: "init-error", message: String(err) });
  }
}

function run(message: Extract<ToWorker, { type: "run" }>): void {
  runId = message.runId;
  stdout.reset();
  stderr.reset();
  const started = performance.now();
  try {
    if (!runner) throw new Error("Python is not ready");
    const result = runner(message.code, message.mode, message.tests, message.files);
    stdout.flush();
    stderr.flush();
    post({
      type: "done",
      runId,
      ok: result.ok,
      ...(result.error ? { error: result.error } : {}),
      ...(result.checks ? { checks: result.checks } : {}),
      ms: performance.now() - started,
    });
  } catch (err) {
    // Python errors never reach here, the harness catches them. This means the runtime broke.
    post({
      type: "done",
      runId,
      ok: false,
      error: { type: "Fatal", message: String(err) },
      ms: performance.now() - started,
    });
  }
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  if (event.data.type === "init") void init();
  else run(event.data);
};
