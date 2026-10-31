# PyReps — Content Guide

Content is what makes PyReps worth using, so it gets the same care as code. Every card is YAML in `content/cards/<topic>.yaml` and is **checked with real Python** by `scripts/validate_content.py`. The seed files `content/cards/dicts.yaml`, `content/cards/unpack.yaml`, `content/cards/net.yaml`, `content/cards/security.yaml` and `content/projects/sbc-log-parser.yaml` show every type across both the telecom core and the domain decks. Copy their style.

## Two tracks: telecom core + domain decks
The goal is general Python fluency for interviews, networking/telecom and pentest work, and personal projects — not only telecom. So content comes in two tracks:
- **Core track (topics 1–12, telecom)**: the language features Bati is missing, taught on the voice-lab data. This stays the main priority and the place where each feature is introduced.
- **Domain decks (topics 13–18)**: `net`, `web`, `security`, `data`, `automation`, `concurrency`. These re-use the same features in networking, web/API, security, data-wrangling and scripting contexts, so the skills transfer. A domain card should still exercise a real language feature (a comprehension, `struct`, a dataclass), not just an API call.

Introduce a feature in the core track first; a domain deck then reinforces it. Many pentest/networking tasks are really the core features (parsing, regex, dicts, `struct`, `requests` patterns, hashing) applied to new data, so lean on that overlap.

## The learner
Bati writes Java professionally and Python at an intermediate level. The cards should drill exactly the Python-specific parts he is missing: dict methods, `*`/`**`, comprehensions and generators, decorators, classes with `@property` and `@classmethod`, dunder methods, dataclasses and enums, f-string format specs, regex named groups, exceptions and logging, `subprocess`/env/HTTP patterns, argparse and exit codes. English is his second language, so the text rules below matter.

## Writing rules
1. **One idea per card.** If the explanation needs "and also", make two cards.
2. **Short code.** 3–8 lines for `predict`, `fill`, `spot_bug` and `mcq`; at most 10 lines for `parsons`; 2–8 lines to write for `write`. Lines at most 60 characters so they fit a phone without much scrolling.
3. **Realistic voice-lab data**: CDRs, SIP codes (200, 486, 480, 487, 404, 408, 500, 503), trunks (`ic-ams-01`, `ic-rtd-02`, `biz-trunk-07`), SBCs, pods, Prometheus, ASR/NER/ACD. Use `from voicelab import load_cdrs, read_log, fake_kubectl, fake_prometheus` when a card needs the dataset. Don't use foo/bar.
4. **Plain English.** Short sentences, everyday words, no idioms. Write "Tap the line with the bug", not "Identify the erroneous statement".
5. **`explain` teaches.** 1–3 sentences: why the answer is right, and the most likely wrong belief. It's shown after every answer, right or wrong.
6. **Deterministic output only.** No `random` without a seed, no `datetime.now()`, no set printing order (use `sorted`), no memory addresses, no timing values.
7. **Distractors are real mistakes**: `*` vs `**`, `item[0]` vs `item[1]`, `[]` vs `.get`, `list` vs `tuple`, off-by-one, `is` vs `==`. Never use silly options.
8. **Levels**: 1 = recognise the idiom; 2 = use it in a small realistic task; 3 = combine two ideas or catch a subtle trap (mutable default, generator exhausted, `SystemExit`).
9. Python version: answers must be the same on CPython 3.12–3.14 (the app runs Pyodide with 3.14). Avoid version-specific output, such as exact error message wording, except where the message is stable.
10. **Runs in the app.** The app's Python (Pyodide) can't start threads or processes, `asyncio.run()` fails there, and `hashlib.pbkdf2_hmac` is missing. `npm test` runs every card in Pyodide too. `write` cards and project steps are the only code the app runs, so they must work there. A read-only card (predict, mcq, fill, spot_bug, parsons) may show real threads, `asyncio.run` or `subprocess.run` if it has the tag `cpython-only`: the validator still checks it with CPython, and the Pyodide test skips it. Its `explain` says that it runs on a real machine, not in the app's Playground.

## YAML gotchas
- Quote any string containing `: `, `{`, `}`, `#`, `[` or leading `*`, `&`, `!`, `%`, `@`. For example `prompt: "Return {trunk: asr}"`.
- Use block scalars `|` for code, and keep exact indentation (4 spaces in Python).
- Use `>-` for long prose (`explain`).
- `answer` for `predict` is the exact stdout. Quote it if it has special characters, and use `|` for multi-line output.

## Card types (fields beyond `id, type, topic, level, prompt, explain, tags?`)
| type | fields | rules |
|---|---|---|
| `predict` | `code`, `answer`, `options?` | stdout must equal `answer`. With `options` it becomes multiple choice (3–4 options containing the answer); otherwise the user types it |
| `mcq` | `options`, `correct` (0-based), `code?` | 3–4 options; add tag `raises` if `code` intentionally raises |
| `fill` | `code` with `____` per blank, `blanks: [{answer, options}]`, `expected_output?` | 1–3 blanks, 3–4 options each, filled code must run |
| `spot_bug` | `code`, `bug_line` (1-based), `fixed_code`, `expected_output?` | Exactly one buggy line; the fix changes only that line; the bug must visibly matter (crash or different output) |
| `parsons` | `lines` (correct order, real indentation), `distractors?` (0–2), `setup?` (hidden code run first), `expected_output?` | 4–8 lines; avoid tasks where two orders are both correct |
| `write` | `starter`, `tests`, `hint`, `solution` | `tests` use `check(lambda: cond, "plain message")`; the starter must FAIL, the solution must PASS; 2–5 checks with messages that say what's expected |

## Topic plan (target about 20 cards each; mix of types)
Suggested mix per topic: 6 predict, 3 mcq, 3 fill, 3 spot_bug, 3 parsons, 2 write. About 70% of cards should be tap-only.

| topic | must cover |
|---|---|
| `setup` | `if __name__ == "__main__"`, `sys.exit(main())`, exit code meaning (0 vs non-zero), shebang/docstring purpose, venv/pip facts (mcq) |
| `dicts` | `[]` vs `.get`, `in`, `.items()`, counting with `.get`/`Counter`, `setdefault`, `defaultdict(list/int)`, nested dict stats, dict comprehension, sort by value, insertion order, hashable keys (tuple yes, list no) |
| `unpack` | `a, b = pair`, swap, `first, *rest`, `*_`, `f(*list)`, `f(**dict)`, `*args`/`**kwargs` types, keyword-only `*`, `{**a, **b}`, `a | b`, later key wins, `*` on a dict gives keys |
| `iter` | list/set/dict comprehension with `if`, generator expression vs list, `yield`, generator laziness and exhaustion (second loop gives nothing), `zip`, `enumerate(start=1)`, `any`/`all`, `sorted`/`min`/`max` with `key`, `itertools.islice` |
| `functions` | mutable default trap and the `None` fix, type hints not enforced, functions as values (dispatch dict), `lambda`, closure remembers a variable, decorator = `f = deco(f)`, wrapper with `*args, **kwargs`, `functools.wraps`, decorator factory (`retry(times)`) |
| `classes` | `__init__`, `self` is the object, method call is `Class.method(obj)`, instance vs class attribute (shared list trap), `@property` (no parentheses), setter validation, `@classmethod` alternative constructor, `@staticmethod`, `_internal` naming |
| `dunders` | which syntax calls which method (`len`→`__len__`, `print`→`__str__`→falls back to `__repr__`, `==`, `<`/`sorted`, `in`, `for`, `[]`, `+`, `with`, `()`), `!r`, `__exit__` always runs, returning False re-raises |
| `dataclasses` | generated `__init__`/`__repr__`/`__eq__`, `order=True` compares fields top-down, `field(compare=False)`, `frozen=True`, `default_factory=list`, `__post_init__`, `Enum` `.name`/`.value`/`Enum("value")`, classmethod on Enum, inheritance and `super().__init__`, overriding a class attribute |
| `text` | format specs `:>10` `:<10` `:.1%` `:,` `:03d` `:.2f` `!r` `=`, `csv.DictReader` values are strings, `json.loads`/`dumps(indent=2)`, `.get` chains on JSON, regex named groups, `match` returns None, `findall`, raw strings, `datetime.fromisoformat`, `timedelta`, `strftime("%H:%M")` |
| `errors` | read the traceback bottom-up, `try/except/else/finally` order of execution, catching specific exceptions, tuple of exceptions, custom exception class, `raise ... from err` and `__cause__`, bare `except` dangers, logging levels and hidden DEBUG, `%s` lazy formatting, `log.exception` |
| `systems` | `os.environ.get` returns `str` (convert with float/int), required vs optional env vars, `subprocess.run([...])` list vs `shell=True` injection, `check=True`, `capture_output`/`text`, JSON from kubectl (via `fake_kubectl`), Prometheus value is `[ts, "string"]`, `timeout=` on requests, backoff 1-2-4-8 |
| `cli` | `argparse` positional vs `--option`, `type=float`, `choices`, `default`, subcommands with `dest`/`required=True`, `parse_args(list)` for testing, `SystemExit(2)` on bad args, Nagios exit codes 0/1/2 |

### Domain decks (topics 13–18, about 15 cards each)
**Offline rule for every domain card**: the app and the validator cannot open real sockets, DNS or network connections. So teach the parts that run offline — build and parse bytes, do address math, hash, encode, transform — and use the `fake_kubectl` / `fake_prometheus` helpers (or a literal response string) instead of live requests. Put the live version in `explain` as "on a real machine you'd ..." so Bati still learns the real call. Keep pentest/security content **defensive and educational**: parsing, recon-style data handling, hashing, encoding, input validation, constant-time comparison, masking secrets. No exploit or attack tooling, no malware, no credential-harvesting code.

| topic | must cover |
|---|---|
| `net` | `ipaddress` (ip_network, ip_address, `in`, `.hosts()`, num_addresses, /CIDR math), `struct.pack`/`unpack` with `>BHIQ` for headers (RTP/DNS-style), byte order, `bytes`/`hex()`/`int.from_bytes`, parsing a fixed byte layout, port-range math, `socket` facts via mcq (TCP vs UDP, `AF_INET`, what `socket.socket()` returns) without connecting |
| `web` | `urllib.parse` (urlparse, parse_qs, urlencode), building a query string, HTTP status classes (2xx/4xx/5xx), the `requests` call shape (`params=`, `timeout=`, `raise_for_status`, `.json()`) shown and reasoned about via a fake response, headers as a dict, Basic/Bearer auth header format, JSON pagination logic |
| `security` | `hashlib` (sha256/md5 facts, hexdigest length, file integrity), `base64` encode/decode is reversible (ties to K8s Secrets), `secrets.token_urlsafe`/`token_hex` vs `random`, `hmac.compare_digest` and why timing matters, masking PII with regex, validating input before use, `hashlib.pbkdf2_hmac` concept for passwords (mcq) |
| `data` | `pathlib` (Path, `/`, `.read_text`, `.glob`, `.suffix`, `.stem`), `csv.DictReader`/`DictWriter`, `json` round-trips, `collections` (Counter, defaultdict, namedtuple), slicing and `sorted(key=)` on records, `statistics` (mean, median, pstdev), `datetime` ranges/grouping |
| `automation` | `argparse` recap applied to a general CLI, `subprocess.run([...])` list form vs `shell=True` injection, `check=True`/`capture_output`/`text`, reading exit codes, `os.environ`, `pathlib.glob` over a folder, `with open(...)` for safe file writes, a cron expression's meaning (mcq), `logging` to stderr |
| `concurrency` | the GIL in one mcq (threads help I/O, not CPU), `concurrent.futures.ThreadPoolExecutor` map pattern (reasoned offline), `async def`/`await`/`asyncio.gather` shape, when async beats threads, a race on a shared counter and the fix (lock), rate-limiting many requests conceptually |

## Projects (`content/projects/<id>.yaml`)
A project is a list of `write` steps. **Each step's `starter` contains the full file so far** (the previous step's solution plus the new TODO), so each step validates on its own. Steps are 3–5 per project, level 2–3. Planned projects:
1. `sbc-log-parser`: parse lines, then average setup time per SBC, then the 3 slowest calls as a table (seed has step 1).
2. `kpi-report`: `TrunkStats` class with properties, then a report table with f-string specs, then JSON output with `json.dumps`.
3. `pod-health-check`: parse `fake_kubectl()` JSON, classify problems, print a summary, return Nagios exit codes.
4. `voicekit-cli`: argparse with `report`/`check` subcommands wiring the pieces together. `main(argv)` returns the exit code.
5. `subnet-planner` (networking): take a CIDR, print usable hosts, split into smaller subnets with `ipaddress`, flag whether a given IP is inside — all offline.
6. `log-triage` (security/data): read a log, mask phone numbers, count events per source with `Counter`, and sha256-fingerprint each line to spot changes between two runs.

In the app, a finished project offers "Export file", which saves `<project>.py` to iOS Files so it can be run in a-Shell with real files.

## Validation
To fill outputs without typing them, put `__RUN__` where the output goes (`answer: __RUN__`, one option `- __RUN__`, or `expected_output: __RUN__`) and run `.venv/bin/python scripts/fill_outputs.py content/cards/<topic>.yaml`. It runs the code like the validator and writes what Python printed. The build also rejects shown code lines over 60 characters.

Run `.venv/bin/python scripts/validate_content.py` (add `--topic dicts` for one topic, `--verbose` to list passes). It must report `0 with problems` before any commit that touches `content/`. Then run `npm test`, which runs the same cards in Pyodide (rule 10). The validator, not the author, is the source of truth for expected outputs: write the code, run it, then copy the real output into `answer`.
