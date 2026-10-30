# PyReps — Product Requirements

## One-line summary
A free, offline-capable mobile web app (PWA) for iPhone that makes Bati practise the Python he is learning in short daily sessions: thumb-friendly retrieval exercises scheduled with spaced repetition, plus small runnable coding tasks and mini projects, all themed on Voice/OSS DevOps work.

## Why this exists
- Bati is preparing for a Junior DevOps Engineer (Voice) role and works through a 12-module Python course on his PC. Python is his weakest of the three skills he is building (Python, Docker, Kubernetes).
- He often has only his iPhone 16. Native iOS apps need a paid Apple developer account, so the product must be a web app: free to build, host and install ("Add to Home Screen").
- Typing code on a phone is slow. The learning formats are therefore chosen to need **taps more than typing**. They are formats with research support:
  - **Retrieval practice**: testing yourself beats re-reading. In Roediger & Karpicke (2006), recall after 1 week was 56% with testing vs 42% with restudy.
  - **Spacing and interleaving**: in a CS1 case study, students who spaced and mixed their practice scored 8 vs 6.84 out of 8 on the final coding exam (small sample, not randomised).
  - **Code tracing** ("predict the output") is a base skill many novices lack (Lister et al. 2004, 941 students).
  - **Parsons problems** (reorder given lines) are solved significantly faster than writing the same code, with equal learning gains (Ericson).

## User
Single user: Bati. He is a CS graduate who writes Java professionally and Python at an intermediate level. He doesn't know some Python-specific idioms: OOP details, dunder methods, `*`/`**` unpacking, dict details, decorators, generators. He is a visual, concrete learner who wants worked examples with real numbers. English is his second language, so UI copy must be plain and short.

## Core use cases
1. **Daily session (main loop, about 10 minutes)**: open the app, then "Start today's reps". About 15–20 cards follow: due reviews first, then a few new cards, interleaved across topics. Every card is graded automatically. The session ends with a summary.
2. **Practise a topic**: pick "Dictionaries" and do 10 cards from it right now. This is extra practice and doesn't disturb the schedule more than normal reviews would.
3. **Mini project**: a guided 3–6 step project (for example "SBC log parser"). Each step is a small write-and-run task in a persistent workspace. The finished script can be exported to the iOS Files app and run in a-Shell.
4. **Playground**: a free editor with a symbol key bar and the sample data files, for trying things.
5. **Offline**: everything works without network after the first load, on a train or in the gym.

## Card types (details in CONTENT.md)
| Type | Interaction | Skill |
|---|---|---|
| `predict` | Read code, then type or pick the exact output | Tracing |
| `mcq` | Pick one of 3–4 options | Concepts, "which line/why" |
| `fill` | Tap chips to fill 1–3 blanks in code | Syntax recall (`**`, `.items()`, `@property`) |
| `spot_bug` | Tap the buggy line, then see the fix | Debugging, reading |
| `parsons` | Tap lines into order and set indentation | Structure, writing without typing |
| `write` | Type 2–8 lines, run against hidden tests | Producing code |

## Content scope (v1)
Topics follow the course modules: `setup` (script shape, `__name__`, exit codes), `dicts`, `unpack`, `iter` (comprehensions, generators, helpers), `functions` (defaults, closures, decorators), `classes`, `dunders`, `dataclasses` (and enums, inheritance), `text` (f-strings, regex, JSON, CSV, dates), `errors` (and logging), `systems` (env vars, subprocess and HTTP patterns, using fakes), `cli` (argparse, exit codes). Target is **240 validated cards** (about 20 per topic) and **6 mini projects**: 4 on the core track first, then 2 for the networking and security decks.

The **core track** (topics 1–12) uses the voice-lab domain (CDRs, SIP codes, trunks, SBC logs, pods, Prometheus) and the bundled sample data in `seed/data/`. On top of it, **domain decks** (topics 13–18: networking, web/APIs, security, data, automation, concurrency) reinforce the same language features in the contexts Bati needs for interviews, networking/telecom and pentest work, and his personal projects. Telecom stays the main priority; the decks broaden transfer. Target is **about 330 cards** total (~240 core + ~90 across the decks). Everything runs offline, so networking/security cards build and parse bytes, do address math, hash and encode, and use request/response fakes rather than live connections; security content stays defensive and educational.

## Functional requirements
- FR1 Spaced repetition per card (FSRS). Grades are derived automatically from correctness, retries and hints. There is no self-rating step.
- FR2 Daily plan: due reviews (capped, default 40), plus new cards (default 8/day), interleaved so the same topic doesn't appear twice in a row when avoidable.
- FR3 Topic unlocking: the user marks which course modules he has finished. New cards only come from unlocked topics. Reviews always come from any topic.
- FR4 Real Python: code runs in real CPython (Pyodide) in a Web Worker. Runs time out after 5 s, the worker restarts, and the UI stays responsive.
- FR5 Sample data is available on the virtual filesystem (`data/cdrs.csv`, `data/sip.log`, `data/pods.json`, `data/prom.json`), together with a helper module `voicelab` (`fake_kubectl()`, `fake_prometheus()`).
- FR6 Mobile code input: a symbol bar above the keyboard (`( ) [ ] { } : " ' = _ * . , # Tab ⇥`, plus undo), autocorrect/capitalisation off, 4-space indentation, auto-indent after `:`.
- FR7 Progress is stored on the device (IndexedDB). Export/import JSON backup. Persistent storage is requested.
- FR8 Stats: streak, cards done today, 7-day retention (share of reviews passed), per-topic mastery bar.
- FR9 Projects: steps with persistent files. Export a file via the iOS share sheet (Web Share API with files). Fallback: copy to clipboard.
- FR10 Installable PWA: manifest, icons, standalone display, works offline.

## Non-functional requirements
- Cost: €0. Free hosting (GitHub Pages), no paid APIs, no accounts, no backend in v1.
- Platform: iPhone 16, Safari / Home Screen web app, iOS 18+. It must also work on desktop Chrome/Safari for development.
- Performance: the app shell is interactive in under 2 s on 4G. Python is ready within about 5 s on first visit (cached afterwards). Card transitions under 100 ms.
- Accessibility: tap targets ≥ 44×44 pt, dynamic type friendly, VoiceOver labels on controls, light and dark mode.
- Privacy: no analytics, no third-party requests after install.
- Correctness: every card's answer is machine-validated with real Python in CI. No hand-written "expected output" ships unchecked.

## Out of scope for v1
Accounts and cloud sync (export/import covers backups; a sync phase is optional later), AI-generated feedback, Docker/Kubernetes cards (possible v2 decks), leaderboards, notifications. iOS Home Screen web apps can do push notifications, but that's a later phase.

## Success criteria
- Bati uses it at least 5 days a week for 4 weeks.
- 7-day review pass rate stays at 80% or higher. That means the scheduling isn't too hard or too easy.
- He can write the course exercises (dicts, `**`, dataclass, decorator) on the PC without looking them up.
