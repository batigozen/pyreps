import type { PyodideAPI } from "pyodide";
import harness from "./harness.py?raw";
import voicelab from "../../python/voicelab.py?raw";
import cdrs from "../../seed/data/cdrs.csv?raw";
import pods from "../../seed/data/pods.json?raw";
import prom from "../../seed/data/prom.json?raw";
import sipLog from "../../seed/data/sip.log?raw";

const SEED_DIR = "/opt/pyreps-seed";

// Copied into /home/pyodide before every run, so a run can't damage them for the next one.
const SEED_FILES: Record<string, string> = {
  "harness.py": harness,
  "voicelab.py": voicelab,
  "data/cdrs.csv": cdrs,
  "data/pods.json": pods,
  "data/prom.json": prom,
  "data/sip.log": sipLog,
};

// Modules most cards use, imported up front so the first run is fast on the phone.
const WARM_IMPORTS =
  "import collections, csv, dataclasses, datetime, enum, functools, itertools, json, re, typing";

// The Pyodide boundary: Pyodide returns untyped Python objects.
type Harness = {
  run: (code: string, mode: string, tests?: string, files?: unknown) => string;
  snapshot: () => void;
};

export type HarnessResult = {
  ok: boolean;
  error: { type: string; message: string; traceback?: string; line?: number | null } | null;
  checks: { passed: boolean; failures: string[] } | null;
};

export type Runner = (
  code: string,
  mode: "plain" | "test",
  tests?: string,
  files?: Record<string, string>,
) => HarnessResult;

/** Prepares a loaded Pyodide: seed files, harness, clean-state snapshot. */
export function setupPython(pyodide: PyodideAPI): Runner {
  pyodide.FS.mkdirTree(`${SEED_DIR}/data`);
  for (const [path, text] of Object.entries(SEED_FILES)) {
    pyodide.FS.writeFile(`${SEED_DIR}/${path}`, text);
  }
  // Harness code stays importable even while the user's run replaces files in the home folder.
  pyodide.runPython(`
import shutil, sys
sys.path.insert(0, ${JSON.stringify(SEED_DIR)})
import harness
shutil.copytree(${JSON.stringify(SEED_DIR)}, "/home/pyodide", dirs_exist_ok=True)
sys.path.remove(${JSON.stringify(SEED_DIR)})
sys.path.insert(0, "/home/pyodide")
${WARM_IMPORTS}
`);
  const module = pyodide.pyimport("harness") as Harness;
  module.snapshot();

  return (code, mode, tests, files) => {
    const pyFiles = files ? pyodide.toPy(files) : undefined;
    try {
      return JSON.parse(module.run(code, mode, tests, pyFiles)) as HarnessResult;
    } finally {
      (pyFiles as { destroy?: () => void } | undefined)?.destroy?.();
    }
  };
}
