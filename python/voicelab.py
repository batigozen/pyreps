"""voicelab: sample data and stand-ins for real systems.

The same file is used in three places:
  * inside the PyReps app (Pyodide), where data files live in /home/pyodide/data/
  * by scripts/validate_content.py (CPython), where they live in seed/data/
  * next to a script exported from the app to a-Shell, with the data files in the
    same folder (no data/ subfolder)

On a real machine you'd replace fake_kubectl() with
    subprocess.run(["kubectl", *args], capture_output=True, text=True, check=True).stdout
and fake_prometheus() with
    requests.get(f"{PROM_URL}/api/v1/query", params={"query": q}, timeout=5).text
"""
import csv
import os
from pathlib import Path

_HERE = Path(__file__).parent
_DEFAULT = _HERE / "data" if (_HERE / "data").is_dir() else _HERE
DATA = Path(os.environ.get("VOICELAB_DATA") or _DEFAULT)


def load_cdrs() -> list[dict]:
    """All call records from data/cdrs.csv as a list of dicts (values are strings)."""
    with open(DATA / "cdrs.csv", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def read_log() -> list[str]:
    """Lines of data/sip.log, without trailing newlines."""
    return (DATA / "sip.log").read_text(encoding="utf-8").splitlines()


def fake_kubectl(*args: str) -> str:
    """Stand-in for `kubectl get pods -n voice-oss -o json`: returns the JSON text."""
    return (DATA / "pods.json").read_text(encoding="utf-8")


def fake_prometheus(query: str, **kwargs) -> str:
    """Stand-in for the body of GET /api/v1/query: returns the JSON text."""
    return (DATA / "prom.json").read_text(encoding="utf-8")
