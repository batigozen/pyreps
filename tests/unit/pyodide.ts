import { loadPyodide } from "pyodide";
import { setupPython, type HarnessResult } from "../../src/python/setup.ts";

export type Run = HarnessResult & { stdout: string; stderr: string };

export type TestPython = (
  code: string,
  options?: { mode?: "plain" | "test"; tests?: string; files?: Record<string, string> },
) => Run;

/** The real harness in real Pyodide, without a browser. */
export async function startPython(): Promise<TestPython> {
  const pyodide = await loadPyodide();
  let stdout = "";
  let stderr = "";
  const decoder = new TextDecoder();
  pyodide.setStdout({
    write: (bytes: Uint8Array) => {
      stdout += decoder.decode(bytes);
      return bytes.length;
    },
  });
  pyodide.setStderr({
    write: (bytes: Uint8Array) => {
      stderr += decoder.decode(bytes);
      return bytes.length;
    },
  });
  pyodide.setStdin({ error: true });
  const runner = setupPython(pyodide);
  return (code, options = {}) => {
    stdout = "";
    stderr = "";
    const result = runner(code, options.mode ?? "plain", options.tests, options.files);
    return { ...result, stdout, stderr };
  };
}
