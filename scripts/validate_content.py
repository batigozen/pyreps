#!/usr/bin/env python3
"""Validate every PyReps card by running it with real CPython.

Usage:  python3 scripts/validate_content.py [--topic dicts] [--verbose]
Needs:  pip install pyyaml
Exit code 0 = all cards valid, 1 = at least one problem (CI fails).

What is checked (see CONTENT.md):
  predict   code runs; its stdout equals `answer` (normalised); answer is among `options` if given
  mcq       0 <= correct < len(options); options unique; `code` (if any) runs without error
  fill      number of ____ == number of blanks; answers are among options; code with answers runs;
            stdout == expected_output if given
  spot_bug  1 <= bug_line <= number of lines; fixed_code runs (and matches expected_output);
            the buggy code must crash OR print something different from fixed_code
  parsons   setup + lines runs; stdout == expected_output if given; distractors not in lines
  write     solution + tests passes every check; starter + tests does NOT pass
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "content" / "cards"
PROJECTS = ROOT / "content" / "projects"
TIMEOUT_S = 5

HARNESS = '''
_fails = []
def check(cond, msg):
    try:
        ok = cond() if callable(cond) else bool(cond)
    except Exception as e:
        ok = False
        msg = f"{msg} [{type(e).__name__}: {e}]"
    if not ok:
        _fails.append(msg)
'''
REPORT = '''
print("__PYREPS_RESULT__", len(_fails))
for _f in _fails:
    print("__FAIL__", _f)
'''


def norm(s: str) -> str:
    return "\n".join(line.rstrip() for line in s.replace("\r\n", "\n").split("\n")).strip("\n")


class Runner:
    """Runs code in a throwaway folder that looks like the app's /home/pyodide."""

    def __init__(self):
        self.dir = Path(tempfile.mkdtemp(prefix="pyreps-"))
        shutil.copytree(ROOT / "seed" / "data", self.dir / "data")
        shutil.copy(ROOT / "python" / "voicelab.py", self.dir / "voicelab.py")

    def run(self, code: str, files: dict | None = None):
        for name, text in (files or {}).items():
            p = self.dir / "project" / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")
        main = self.dir / "main.py"
        main.write_text(code, encoding="utf-8")
        try:
            r = subprocess.run([sys.executable, "main.py"], cwd=self.dir, capture_output=True,
                               text=True, timeout=TIMEOUT_S, env={"PYTHONPATH": str(self.dir), "PYTHONHASHSEED": "0", "PATH": "/usr/bin:/bin"})
            return r.returncode, r.stdout, r.stderr
        except subprocess.TimeoutExpired:
            return -1, "", f"timeout after {TIMEOUT_S}s"

    def cleanup(self):
        shutil.rmtree(self.dir, ignore_errors=True)


def run_tests(runner: Runner, code: str, tests: str, files=None):
    src = HARNESS + "\n" + code + "\n\ntry:\n" + textwrap.indent(tests, "    ") + \
        "\nexcept Exception as _e:\n    check(False, f'tests crashed: {_e!r}')\n" + REPORT
    rc, out, err = runner.run(src, files)
    if "__PYREPS_RESULT__" not in out:
        return False, [f"code crashed before tests: {err.strip().splitlines()[-1] if err.strip() else rc}"]
    fails = [l[len("__FAIL__ "):] for l in out.splitlines() if l.startswith("__FAIL__ ")]
    return not fails, fails


def validate_card(c: dict, runner: Runner, files=None) -> list[str]:
    p = []
    t = c.get("type")
    for key in ("id", "type", "topic", "level", "prompt", "explain"):
        if key not in c:
            p.append(f"missing field `{key}`")
    if t == "predict":
        rc, out, err = runner.run(c["code"], files)
        if rc != 0:
            p.append(f"code exits with {rc}: {err.strip().splitlines()[-1] if err.strip() else ''}")
        elif norm(out) != norm(str(c["answer"])):
            p.append(f"answer mismatch\n      expected (card): {norm(str(c['answer']))!r}\n      actual (python): {norm(out)!r}")
        if c.get("options") and str(c["answer"]) not in [str(o) for o in c["options"]]:
            p.append("answer is not one of options")
    elif t == "mcq":
        opts = c.get("options", [])
        if not (0 <= c.get("correct", -1) < len(opts)):
            p.append("`correct` index out of range")
        if len(set(map(str, opts))) != len(opts):
            p.append("duplicate options")
        if c.get("code") and "raises" not in c.get("tags", []):
            rc, _, err = runner.run(c["code"], files)
            if rc != 0:
                p.append(f"mcq code crashes: {err.strip().splitlines()[-1]}")
    elif t == "fill":
        code, blanks = c["code"], c.get("blanks", [])
        if code.count("____") != len(blanks):
            p.append(f"{code.count('____')} blanks in code but {len(blanks)} in `blanks`")
        for b in blanks:
            if b["answer"] not in b["options"]:
                p.append(f"blank answer {b['answer']!r} not in options")
            if len(set(b["options"])) != len(b["options"]):
                p.append("duplicate blank options")
        for b in blanks:
            code = code.replace("____", b["answer"], 1)
        rc, out, err = runner.run(code, files)
        if rc != 0:
            p.append(f"filled code crashes: {err.strip().splitlines()[-1]}")
        elif c.get("expected_output") is not None and norm(out) != norm(c["expected_output"]):
            p.append(f"expected_output mismatch: {norm(out)!r}")
    elif t == "spot_bug":
        n = len(c["code"].rstrip("\n").split("\n"))
        if not (1 <= c.get("bug_line", 0) <= n):
            p.append(f"bug_line {c.get('bug_line')} outside 1..{n}")
        rc_f, out_f, err_f = runner.run(c["fixed_code"], files)
        if rc_f != 0:
            p.append(f"fixed_code crashes: {err_f.strip().splitlines()[-1]}")
        if c.get("expected_output") is not None and norm(out_f) != norm(c["expected_output"]):
            p.append(f"fixed_code output mismatch: {norm(out_f)!r}")
        rc_b, out_b, _ = runner.run(c["code"], files)
        if rc_b == 0 and norm(out_b) == norm(out_f):
            p.append("buggy code behaves exactly like fixed_code (the bug has no visible effect)")
    elif t == "parsons":
        lines = c.get("lines", [])
        if len(lines) < 3:
            p.append("parsons needs at least 3 lines")
        for d in c.get("distractors", []) or []:
            if d in lines:
                p.append(f"distractor is also a correct line: {d!r}")
        code = (c.get("setup", "") + "\n" if c.get("setup") else "") + "\n".join(lines)
        rc, out, err = runner.run(code, files)
        if rc != 0:
            p.append(f"assembled code crashes: {err.strip().splitlines()[-1]}")
        elif c.get("expected_output") is not None and norm(out) != norm(c["expected_output"]):
            p.append(f"expected_output mismatch: {norm(out)!r}")
    elif t == "write":
        ok, fails = run_tests(runner, c["solution"], c["tests"], files)
        if not ok:
            p.append("solution fails its tests: " + "; ".join(fails))
        ok_s, _ = run_tests(runner, c["starter"], c["tests"], files)
        if ok_s:
            p.append("starter already passes the tests (tests are too weak)")
        for key in ("hint", "solution", "starter", "tests"):
            if not c.get(key):
                p.append(f"write card needs `{key}`")
    else:
        p.append(f"unknown type {t!r}")
    return p


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    runner = Runner()
    seen, problems, count = set(), 0, 0
    try:
        for f in sorted(CARDS.glob("*.yaml")):
            for c in yaml.safe_load(f.read_text(encoding="utf-8")) or []:
                if args.topic and c.get("topic") != args.topic:
                    continue
                count += 1
                cid = c.get("id", "?")
                errs = validate_card(c, runner)
                if cid in seen:
                    errs.append("duplicate id")
                seen.add(cid)
                if errs:
                    problems += 1
                    print(f"✗ {f.name} :: {cid}")
                    for e in errs:
                        print(f"    - {e}")
                elif args.verbose:
                    print(f"✓ {cid}")
        for f in sorted(PROJECTS.glob("*.yaml")) if PROJECTS.exists() else []:
            proj = yaml.safe_load(f.read_text(encoding="utf-8"))
            files = proj.get("files", {})
            for step in proj.get("steps", []):
                count += 1
                errs = validate_card({**step, "topic": step.get("topic", "project"), "type": "write"}, runner, files)
                if errs:
                    problems += 1
                    print(f"✗ {f.name} :: {step.get('id')}")
                    for e in errs:
                        print(f"    - {e}")
    finally:
        runner.cleanup()
    print(f"\n{count} cards checked with Python {sys.version.split()[0]}: {problems} with problems")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
