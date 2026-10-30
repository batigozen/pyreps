import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INIT_TIMEOUT_MS,
  PythonClient,
  RUN_TIMEOUT_MS,
  TIMEOUT_MESSAGE,
  type WorkerLike,
} from "../../src/python/client.ts";
import type { FromWorker, ToWorker } from "../../src/python/protocol.ts";

class MockWorker implements WorkerLike {
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;
  sent: ToWorker[] = [];
  terminated = false;

  postMessage(message: ToWorker) {
    this.sent.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: FromWorker) {
    this.onmessage?.({ data: message } as MessageEvent<FromWorker>);
  }

  lastRunId(): number {
    const run = this.sent.findLast((message) => message.type === "run");
    if (run?.type !== "run") throw new Error("no run was sent");
    return run.runId;
  }
}

function setup() {
  const workers: MockWorker[] = [];
  const client = new PythonClient(() => {
    const worker = new MockWorker();
    workers.push(worker);
    return worker;
  });
  const latest = () => {
    const worker = workers.at(-1);
    if (!worker) throw new Error("no worker yet");
    return worker;
  };
  return { client, workers, latest };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PythonClient", () => {
  it("starts one worker and becomes ready", () => {
    const { client, workers, latest } = setup();
    client.start();
    client.start();
    expect(workers).toHaveLength(1);
    expect(latest().sent).toEqual([{ type: "init" }]);
    expect(client.status).toBe("loading");

    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    expect(client.status).toBe("ready");
    expect(client.pythonVersion).toBe("3.14.2");
  });

  it("holds a run until Python is ready, then returns its output", async () => {
    const { client, latest } = setup();
    const chunks: string[] = [];
    const pending = client.run("print(45)", { onOutput: (_, text) => chunks.push(text) });
    expect(latest().sent).toEqual([{ type: "init" }]);

    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    const runId = latest().lastRunId();
    latest().emit({ type: "stdout", runId, text: "4" });
    latest().emit({ type: "stdout", runId, text: "5\n" });
    latest().emit({ type: "stderr", runId, text: "warn\n" });
    latest().emit({ type: "done", runId, ok: true, ms: 3 });

    await expect(pending).resolves.toEqual({ ok: true, stdout: "45\n", stderr: "warn\n", ms: 3 });
    expect(chunks).toEqual(["4", "5\n", "warn\n"]);
  });

  it("passes test mode fields and returns checks", async () => {
    const { client, latest } = setup();
    client.start();
    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    const pending = client.run("x = 1", { mode: "test", tests: "check(x == 2, 'no')" });
    const message = latest().sent.at(-1);
    expect(message).toMatchObject({ type: "run", mode: "test", tests: "check(x == 2, 'no')" });

    const checks = { passed: false, failures: ["no"] };
    latest().emit({ type: "done", runId: latest().lastRunId(), ok: true, checks, ms: 1 });
    await expect(pending).resolves.toMatchObject({ ok: true, checks });
  });

  it("runs one job at a time, in order", async () => {
    const { client, latest } = setup();
    client.start();
    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    const first = client.run("a");
    const second = client.run("b");
    expect(latest().sent.filter((message) => message.type === "run")).toHaveLength(1);

    latest().emit({ type: "done", runId: latest().lastRunId(), ok: true, ms: 1 });
    await first;
    expect(latest().sent.at(-1)).toMatchObject({ code: "b" });
    latest().emit({ type: "done", runId: latest().lastRunId(), ok: true, ms: 1 });
    await expect(second).resolves.toMatchObject({ ok: true });
  });

  it("stops an endless loop after 5 s and restarts the worker", async () => {
    const { client, workers, latest } = setup();
    client.start();
    const first = latest();
    first.emit({ type: "ready", pythonVersion: "3.14.2" });
    const pending = client.run("while True: pass");
    const runId = first.lastRunId();
    first.emit({ type: "stdout", runId, text: "before\n" });

    vi.advanceTimersByTime(RUN_TIMEOUT_MS - 1);
    expect(first.terminated).toBe(false);
    vi.advanceTimersByTime(1);

    await expect(pending).resolves.toMatchObject({
      ok: false,
      stdout: "before\n",
      error: { type: "Timeout", message: TIMEOUT_MESSAGE },
    });
    expect(first.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(client.status).toBe("restarting");

    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    expect(client.status).toBe("ready");
  });

  it("runs the next job on the new worker after a timeout", async () => {
    const { client, latest } = setup();
    client.start();
    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    const stuck = client.run("while True: pass");
    const next = client.run("print(1)");
    vi.advanceTimersByTime(RUN_TIMEOUT_MS);
    await stuck;

    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    expect(latest().sent.at(-1)).toMatchObject({ code: "print(1)" });
    latest().emit({ type: "done", runId: latest().lastRunId(), ok: true, ms: 1 });
    await expect(next).resolves.toMatchObject({ ok: true });
  });

  it("ignores late messages from a replaced worker", async () => {
    const { client, latest } = setup();
    client.start();
    const old = latest();
    old.emit({ type: "ready", pythonVersion: "3.14.2" });
    const stuck = client.run("while True: pass");
    const oldRunId = old.lastRunId();
    vi.advanceTimersByTime(RUN_TIMEOUT_MS);
    await stuck;

    old.emit({ type: "ready", pythonVersion: "3.0.0" });
    expect(client.status).toBe("restarting");
    old.emit({ type: "done", runId: oldRunId, ok: true, ms: 1 });
    expect(client.pythonVersion).toBe("3.14.2");
  });

  it("restarts when the runtime breaks during a run", async () => {
    const { client, workers, latest } = setup();
    client.start();
    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    const pending = client.run("x");
    const error = { type: "Fatal", message: "broken" };
    latest().emit({ type: "done", runId: latest().lastRunId(), ok: false, error, ms: 1 });
    await expect(pending).resolves.toMatchObject({ ok: false, error });
    expect(workers).toHaveLength(2);
    expect(client.status).toBe("restarting");
  });

  it("reports a failed start, fails waiting runs, and can try again", async () => {
    const { client, workers, latest } = setup();
    const waiting = client.run("x");
    latest().emit({ type: "init-error", message: "no wasm" });
    await expect(waiting).resolves.toMatchObject({
      ok: false,
      error: { type: "NotReady", message: "no wasm" },
    });
    expect(client.status).toBe("error");
    await expect(client.run("y")).resolves.toMatchObject({ error: { type: "NotReady" } });

    client.retry();
    expect(workers).toHaveLength(2);
    expect(client.status).toBe("loading");
    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    expect(client.status).toBe("ready");
  });

  it("gives up if Python never finishes loading", () => {
    const { client } = setup();
    client.start();
    vi.advanceTimersByTime(INIT_TIMEOUT_MS);
    expect(client.status).toBe("error");
  });

  it("tells subscribers about status changes until they leave", () => {
    const { client, latest } = setup();
    const listener = vi.fn();
    const leave = client.subscribe(listener);
    client.start();
    latest().emit({ type: "ready", pythonVersion: "3.14.2" });
    expect(listener).toHaveBeenCalledTimes(1);
    leave();
    client.run("while True: pass");
    vi.advanceTimersByTime(RUN_TIMEOUT_MS);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
