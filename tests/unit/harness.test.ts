// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { startPython, type TestPython } from "./pyodide.ts";

let run: TestPython;

beforeAll(async () => {
  run = await startPython();
}, 60_000);

describe("plain runs", () => {
  it("captures stdout", () => {
    expect(run("print(sum(range(10)))")).toMatchObject({ ok: true, stdout: "45\n", error: null });
  });

  it("keeps output with no final newline", () => {
    expect(run('print("a", end="")').stdout).toBe("a");
  });

  it("has __name__ set to __main__", () => {
    expect(run("print(__name__)").stdout).toBe("__main__\n");
  });

  it("finds the sample data and voicelab", () => {
    expect(run("from voicelab import load_cdrs; print(len(load_cdrs()))").stdout).toBe("48\n");
    expect(run('print(open("data/cdrs.csv").readline().split(",")[0])').stdout).toBe("call_id\n");
  });

  it("supports dataclasses and enums in __main__", () => {
    const code = `
from dataclasses import dataclass
from enum import Enum
class Level(Enum):
    LOW = "low"
@dataclass
class Trunk:
    name: "str"
    level: Level = Level.LOW
print(Trunk("ic-ams-01"))
`;
    expect(run(code).stdout).toBe("Trunk(name='ic-ams-01', level=<Level.LOW: 'low'>)\n");
  });

  it("fails input() at once instead of hanging", () => {
    expect(run("input()").error?.type).toMatch(/OSError|EOFError/);
  });
});

describe("runs don't affect each other", () => {
  it("variables", () => {
    run("secret = 1");
    expect(run("print(secret)").error?.type).toBe("NameError");
  });

  it("files, including damaged sample data", () => {
    run('open("notes.txt", "w").write("x"); open("data/cdrs.csv", "w").write("")');
    const after = run(`
import os
from voicelab import load_cdrs
print(os.path.exists("notes.txt"), len(load_cdrs()))
`);
    expect(after.stdout).toBe("False 48\n");
  });

  it("environment, working folder and argv", () => {
    run('import os, sys; os.environ["TRUNK"] = "x"; os.chdir("/"); sys.argv.append("y")');
    const after = run(`
import os, sys
print(os.environ.get("TRUNK"), os.getcwd(), sys.argv)
`);
    expect(after.stdout).toBe("None /home/pyodide ['main.py']\n");
  });

  it("changes to an imported module", () => {
    run("import voicelab; voicelab.load_cdrs = None");
    expect(run("import voicelab; print(callable(voicelab.load_cdrs))").stdout).toBe("True\n");
  });

  it("logging setup", () => {
    run('import logging; logging.basicConfig(level="DEBUG"); logging.getLogger("x")');
    const after = run(`
import logging
print(logging.getLogger().handlers, logging.getLogger().level)
print("x" in logging.Logger.manager.loggerDict)
`);
    expect(after.stdout).toBe("[] 30\nFalse\n");
  });

  it("a replaced sys.stdout", () => {
    run("import io, sys; sys.stdout = io.StringIO()");
    expect(run('print("visible")').stdout).toBe("visible\n");
  });
});

describe("errors", () => {
  it("shows only the user's frames, named main.py, with the right lines", () => {
    const { ok, error } = run(`def f():
    return 1 / 0

f()
`);
    expect(ok).toBe(false);
    expect(error).toMatchObject({ type: "ZeroDivisionError", line: 2 });
    expect(error?.traceback).toContain('File "main.py", line 4, in <module>');
    expect(error?.traceback).toContain('File "main.py", line 2, in f');
    expect(error?.traceback).toContain("return 1 / 0");
    expect(error?.traceback).not.toContain("harness");
    expect(error?.traceback).not.toContain("/lib/python");
  });

  it("hides library frames but keeps the line that called them", () => {
    const { error } = run('import json\njson.loads("{")');
    expect(error?.type).toBe("JSONDecodeError");
    expect(error?.line).toBe(2);
    expect(error?.traceback).not.toContain("json/");
  });

  it("reports syntax errors at the right line", () => {
    const { error } = run("x = 1\nif x\n    pass");
    expect(error).toMatchObject({ type: "SyntaxError", line: 2 });
    expect(error?.traceback).toContain('File "main.py", line 2');
  });

  it("keeps chained errors", () => {
    const { error } = run(`try:
    {}["x"]
except KeyError as err:
    raise ValueError("bad") from err
`);
    expect(error?.traceback).toContain("KeyError");
    expect(error?.traceback).toContain("ValueError: bad");
    expect(error?.traceback).not.toContain("harness");
  });

  it("survives endless recursion", () => {
    expect(run("def f(): f()\nf()").error?.type).toBe("RecursionError");
    expect(run("print(1)").stdout).toBe("1\n");
  });
});

describe("SystemExit", () => {
  it.each(["sys.exit()", "sys.exit(0)", "sys.exit(None)"])("%s is success", (call) => {
    const result = run(`import sys\nprint("a")\n${call}\nprint("b")`);
    expect(result).toMatchObject({ ok: true, stdout: "a\n", error: null });
  });

  it("a non-zero code is reported, not treated as a crash", () => {
    expect(run("import sys; sys.exit(2)")).toMatchObject({
      ok: false,
      error: { type: "SystemExit", message: "exited with code 2" },
    });
  });

  it("a text message goes to stderr with code 1", () => {
    const result = run('import sys; sys.exit("bad config")');
    expect(result.stderr).toBe("bad config\n");
    expect(result.error?.message).toBe("exited with code 1");
  });
});

describe("test mode", () => {
  const tests = 'check(lambda: f() == 2, "f should return 2")';

  it("passes when the checks pass", () => {
    const result = run("def f(): return 2", { mode: "test", tests });
    expect(result.ok).toBe(true);
    expect(result.checks).toEqual({ passed: true, failures: [] });
  });

  it("lists failed checks in plain words", () => {
    const result = run("def f(): return 1", { mode: "test", tests });
    expect(result.ok).toBe(true);
    expect(result.checks).toEqual({ passed: false, failures: ["f should return 2"] });
  });

  it("turns an error inside a check into a failure message", () => {
    const { checks } = run("def f(): return 1 / 0", { mode: "test", tests });
    expect(checks?.failures).toEqual(["f should return 2 [ZeroDivisionError: division by zero]"]);
  });

  it("turns a crashing test into a failure message", () => {
    const { checks } = run("x = 1", { mode: "test", tests: "y = missing" });
    expect(checks?.passed).toBe(false);
    expect(checks?.failures[0]).toContain("tests crashed: NameError");
  });

  it("stops before the tests when the user's code raises", () => {
    const result = run("x = 1 / 0", { mode: "test", tests });
    expect(result.ok).toBe(false);
    expect(result.error?.type).toBe("ZeroDivisionError");
    expect(result.checks).toBeNull();
  });

  it("forgets failures from the run before", () => {
    run("def f(): return 1", { mode: "test", tests });
    expect(run("def f(): return 2", { mode: "test", tests }).checks?.failures).toEqual([]);
  });

  it("writes project files before the run", () => {
    const result = run('print(open("project/app/cfg.txt").read())', {
      files: { "app/cfg.txt": "threshold=0.65" },
    });
    expect(result.stdout).toBe("threshold=0.65\n");
  });
});
