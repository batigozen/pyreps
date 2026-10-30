"""Runs user code inside the PyReps worker. Loaded once, used for every run.

check() and report() work like the ones in scripts/validate_content.py, so a
card that passes the validator is graded the same way in the app.
"""
import json
import linecache
import logging
import os
import shutil
import sys
import traceback
import types
from pathlib import Path

HOME = Path("/home/pyodide")
SEED = Path("/opt/pyreps-seed")
MAIN = "main.py"

_fails = []
_clean = {}


def check(cond, msg):
    """Record a failure if cond is false. Never raises."""
    try:
        ok = cond() if callable(cond) else bool(cond)
    except Exception as e:
        ok = False
        msg = f"{msg} [{type(e).__name__}: {e}]"
    if not ok:
        _fails.append(msg)


def report():
    return {"passed": not _fails, "failures": list(_fails)}


def snapshot():
    """Remember the clean state. Called once, after startup."""
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
    _clean.update(
        modules=dict(sys.modules),
        path=list(sys.path),
        environ=dict(os.environ),
        stdout=sys.stdout,
        stderr=sys.stderr,
        recursion=sys.getrecursionlimit(),
        loggers=set(logging.Logger.manager.loggerDict),
    )


def _reset_modules():
    for name, module in list(sys.modules.items()):
        if name not in _clean["modules"]:
            # Compiled modules can't be imported twice, so they stay loaded.
            if str(getattr(module, "__file__", "")).endswith(".py"):
                del sys.modules[name]
    sys.modules.update(_clean["modules"])


def _reset_logging():
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.WARNING)
    logging.disable(logging.NOTSET)
    known = logging.Logger.manager.loggerDict
    for name in set(known) - _clean["loggers"]:
        del known[name]


def _reset_files():
    os.chdir("/")
    for entry in HOME.iterdir():
        if entry.is_dir() and not entry.is_symlink():
            shutil.rmtree(entry)
        else:
            entry.unlink()
    shutil.copytree(SEED, HOME, dirs_exist_ok=True)
    os.chdir(HOME)


def _reset():
    """Each run starts like a new process, as it does in the validator."""
    _fails.clear()
    _reset_modules()
    _reset_logging()
    _reset_files()
    sys.path[:] = _clean["path"]
    sys.argv[:] = [MAIN]
    sys.stdout = _clean["stdout"]
    sys.stderr = _clean["stderr"]
    sys.setrecursionlimit(_clean["recursion"])
    os.environ.clear()
    os.environ.update(_clean["environ"])
    linecache.clearcache()


def _trim(exc, seen=None):
    """Keep only the frames from the user's file, also on chained errors."""
    seen = set() if seen is None else seen
    if exc is None or id(exc) in seen:
        return
    seen.add(id(exc))
    frames = []
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == MAIN:
            frames.append(tb)
        tb = tb.tb_next
    trimmed = None
    for frame in reversed(frames):
        trimmed = types.TracebackType(trimmed, frame.tb_frame, frame.tb_lasti, frame.tb_lineno)
    exc.__traceback__ = trimmed
    _trim(exc.__cause__, seen)
    _trim(exc.__context__, seen)


def _error_line(exc):
    if isinstance(exc, SyntaxError) and exc.filename == MAIN:
        return exc.lineno
    line = None
    tb = exc.__traceback__
    while tb is not None:
        line = tb.tb_lineno
        tb = tb.tb_next
    return line


def _describe(exc):
    _trim(exc)
    try:
        text = "".join(traceback.format_exception(exc))
        message = str(exc)
    except Exception:
        # The user's own __str__ can raise too.
        text = message = type(exc).__name__
    return {
        "type": type(exc).__name__,
        "message": message,
        "traceback": text,
        "line": _error_line(exc),
    }


def _exit_error(exc):
    """SystemExit with 0 or None is success. Anything else is an exit code, not a crash."""
    code = exc.code
    if code is None or code == 0:
        return None
    if not isinstance(code, int):
        print(code, file=sys.stderr)
        code = 1
    return {"type": "SystemExit", "message": f"exited with code {code}"}


def _run_tests(tests, namespace):
    namespace["check"] = check
    try:
        exec(compile(tests, "<tests>", "exec", dont_inherit=True), namespace)
    except BaseException as e:
        check(False, f"tests crashed: {e!r}")
    return report()


def run(code, mode="plain", tests=None, files=None):
    """Run one piece of user code. Returns a JSON string for the worker."""
    _reset()
    for name, text in (files or {}).items():
        path = HOME / "project" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    (HOME / MAIN).write_text(code, encoding="utf-8")

    # A real __main__ module, so dataclasses, enums and pickle see what they expect.
    module = types.ModuleType("__main__")
    module.__file__ = str(HOME / MAIN)
    sys.modules["__main__"] = module

    error = None
    try:
        exec(compile(code, MAIN, "exec", dont_inherit=True), module.__dict__)
    except SystemExit as e:
        error = _exit_error(e)
    except BaseException as e:
        error = _describe(e)

    checks = None
    if mode == "test" and error is None:
        checks = _run_tests(tests or "", module.__dict__)

    for stream in (sys.stdout, sys.stderr, _clean["stdout"], _clean["stderr"]):
        try:
            stream.flush()
        except Exception:
            pass
    return json.dumps({"ok": error is None, "error": error, "checks": checks})
