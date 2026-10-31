# PyReps — Build Phases

Work one phase at a time. At the end of each phase: all checks green, a short summary for Bati (what was built, how to try it on the iPhone, anything decided along the way), then **stop and wait** for "continue". Tick the boxes as you go.

---

## Phase 0: Skeleton that installs on the iPhone
Goal: Bati can open a URL on his iPhone, add it to the Home Screen, and see the app shell offline.
- [x] Vite + React + TS (strict) + Tailwind + Zustand + Dexie + HashRouter. ESLint + Prettier. Exact versions pinned.
- [x] Self-hosted fonts (Atkinson Hyperlegible, JetBrains Mono), colour tokens for light and dark, safe-area-aware bottom tab bar with the 5 tabs (placeholder screens).
- [x] `vite-plugin-pwa`: manifest, icons (180/192/512/maskable), offline app shell, update toast.
- [x] GitHub Actions deploy to GitHub Pages (`base: "/pyreps/"`). README section "Install on iPhone".
- [x] Vitest and Playwright set up. One e2e test opens the app in an iPhone profile and switches tabs.
**Done when:** the deployed URL works on the iPhone, it installs to the Home Screen, it opens in airplane mode, and `npm test` passes.

## Phase 1: Python in a worker
Goal: real Python runs offline on the phone, safely.
- [x] `postinstall` script copies the Pyodide distribution files into `public/pyodide/`. They're precached by the service worker (raise the precache size limit).
- [x] `worker.ts` + `client.ts` exactly as in ARCHITECTURE.md (protocol, fresh globals, `__name__ == "__main__"`, data files on the virtual FS, `voicelab.py`, `harness.py`).
- [x] 5 s timeout: the worker is terminated and restarted, and the UI shows "Stopped: took longer than 5 s (endless loop?)".
- [x] Tracebacks trimmed to user frames, `main.py` filename, correct line numbers. `SystemExit(0)` is success.
- [x] Temporary Playground screen: textarea + Run + output, to prove it works on the phone.
- [x] Unit tests for the client (mock worker) and an e2e test that runs `print(sum(range(10)))` and gets `45`, an infinite loop that times out, and `from voicelab import load_cdrs; print(len(load_cdrs()))` that gets `48`.
**Done when:** those three behaviours work on the iPhone, including offline after the first load.

## Phase 2: Content pipeline and tap-only cards
Goal: the four tap-friendly card types work with real content.
- [x] `src/content/schema.ts` (Zod) + `scripts/build_content.ts` → `src/generated/content.json`. The build fails on invalid content.
- [x] `scripts/validate_content.py` (already provided) runs in CI with Python 3.14 (to match Pyodide). Fix it if needed, but don't weaken the checks.
- [x] `CodeView` (read-only, highlighted, line numbers, horizontal scroll, tappable lines for spot_bug).
- [x] `PredictCard` (typed answer, or options when given), `McqCard`, `FillCard` (chip picker per blank), `SpotBugCard` (tap line → show diff to fixed code). Shared `CardFrame`: prompt, body, Check button, result banner, `explain`, "Show answer", Next.
- [x] `grading.ts` pure functions with unit tests (normalisation, multi-blank, and so on).
- [x] A temporary "Card gallery" screen to try every seed card.
**Done when:** every seed card of these types can be answered right and wrong on the iPhone, with correct feedback.

## Phase 3: Parsons and Write cards, mobile editor
- [x] `ParsonsCard`: tap a line in the pool to append it, tap a placed line to send it back, ← / → indent buttons on the placed line, distractors mixed in, Check compares lines + indents. Big tap targets.
- [x] `CodeEditor` + `SymbolBar` as specified (visualViewport positioning, bracket pairs, auto-indent after `:`, own undo).
- [x] `WriteCard`: editor with the starter, Run (plain output), Check (runs tests via harness, lists failed checks in plain words), Hint, Show solution. The draft is saved per card in IndexedDB.
- [x] e2e: solve the seed write card on an iPhone profile using the symbol bar.
**Done when:** Bati can solve `dicts-write-asr-per-trunk` on his phone without fighting the keyboard.

## Phase 4: Spaced repetition and the daily session
- [x] `scheduler.ts` (ts-fsrs, automatic rating rules from ARCHITECTURE.md), `planner.ts` (due + new, caps, interleaving, write-card spacing, 04:00 day boundary), with unit tests using a fake clock.
- [x] Dexie schema v1 + repository functions + `navigator.storage.persist()`.
- [x] Today screen (due/new counts, streak, Start), Session screen (card player, progress, re-queue Again cards once, resume after closing), Summary screen.
- [x] Settings: new per day, max reviews, unlocked topics (default: core modules 1–6 on; the rest and the domain decks off until Bati turns them on), font size.
- [x] Topics screen: mastery bar per topic (share of cards with stability ≥ 21 days), "Practise 10".
**Done when:** a 7-day simulation test (fake clock) shows sensible queues, and a real session on the phone takes about 10 minutes.

## Phase 5: The full card bank
- [x] Author the remaining **core** cards following CONTENT.md, topic by topic (about 20 per topic), in this order: dicts, unpack, iter, functions, classes, dunders, dataclasses, text, errors, systems, cli, setup.
- [x] Then author the **domain decks** (about 15 each): net, web, security, data, automation, concurrency. Follow the offline rule and the defensive-security rule in CONTENT.md. `net` and `security` already have seed cards.
- [x] After each topic: `python3 scripts/validate_content.py --topic <t>` must report 0 problems. Commit per topic.
- [x] Show Bati 3 sample cards per topic in the phase summary so he can veto the style early. Author core topics before domain decks, since decks build on core features.
**Done when:** about 330 cards (~240 core + ~90 deck), 0 validation problems, about 70% tap-only.

## Phase 6: Projects, Playground, export
- [x] Projects screen + project view (step card, file tabs, Run, Check, progress saved).
- [x] Author the 6 projects from CONTENT.md (validator-checked): the 4 core ones first, then `subnet-planner` and `log-triage`.
- [x] "Export file": Web Share API with a `.py` File (`navigator.share({ files })`), with a copy-to-clipboard fallback. Help text explains opening it in a-Shell (`python file.py`).
- [x] Playground: editor + symbol bar + output, last code saved, a "Sample data" sheet listing `data/*` and the `voicelab` helpers.
**Done when:** Bati finishes `sbc-log-parser` on the phone and runs the exported file in a-Shell.

## Phase 7: Stats, backup, polish
- [x] Stats screen: streak calendar (8 weeks), 7-day pass rate, reviews per day, card states.
- [x] Backup export/import (share sheet), schema version + migration test, reset with confirmation sheet (no `confirm()`).
- [x] Accessibility pass (VoiceOver labels, focus order, 44 pt targets, contrast in both themes), `prefers-reduced-motion`.
- [x] Performance: Lighthouse PWA/performance on mobile ≥ 90, cold start < 2 s on throttled 4G (Python loads in background).
- [x] Final README: install, daily use, adding cards, running the validator.
**Done when:** everything in PRD "Success criteria" can be measured from the Stats screen and no known bugs remain.

## Optional Phase 8: Sync (only if Bati asks)
Options to discuss before building: a GitHub Gist as storage via a personal token (free, no server), or a tiny API on Vercel + Neon free tier (his usual stack). Last-write-wins per card state with timestamps.
