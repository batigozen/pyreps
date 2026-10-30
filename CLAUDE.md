# CLAUDE.md — PyReps

PyReps is a free, offline-first PWA for iPhone. It makes Bati practise Python with short, auto-graded cards (spaced repetition) and small runnable coding tasks, themed on Voice/OSS DevOps work.

**Read before any work:** `PRD.md` (what and why), `ARCHITECTURE.md` (how), `PHASES.md` (order and done criteria), `CONTENT.md` (card rules). If these documents conflict with each other or with reality (for example a library API changed), stop and ask instead of guessing.

## How to work
- One phase at a time from `PHASES.md`. Don't start the next phase without an explicit "continue".
- At the start of a phase, post a short plan (files you'll create or change, risks). At the end: run all checks, tick the boxes in `PHASES.md`, and write a summary covering what changed, how to try it on the iPhone, and decisions made.
- Prefer small, reviewable commits with conventional messages (`feat:`, `fix:`, `content:`, `test:`, `chore:`).
- When unsure about iOS Safari behaviour (keyboard, visualViewport, storage, share sheet), say so, and add a manual test step for Bati instead of claiming it works.

## Commands
```bash
npm run dev                            # Vite dev server (use --host to test on the iPhone over Wi-Fi)
npm run build                          # builds content.json, then the app
npm test                               # vitest
npm run e2e                            # builds, then playwright (iPhone profile)
npm run lint
# Python: one-time `python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt`
.venv/bin/python scripts/validate_content.py    # MUST be green before committing content
.venv/bin/python scripts/validate_content.py --topic dicts --verbose
```

## Hard rules
1. **€0 total.** No paid services, no API keys, no backend in v1, no analytics, no runtime requests to third-party hosts. Pyodide and fonts are self-hosted.
2. **User code only runs in the Pyodide worker.** No `eval`/`new Function` on the main thread. The worker never touches the DOM or IndexedDB.
3. **No unchecked content.** Never hand-write an expected output, answer or test result. Write the code, run the validator, and copy the real output. A card that fails validation doesn't ship.
4. **Mobile first.** Design and test at 393×852 (iPhone 16) first. Tap targets ≥ 44 pt. No hover-only UI. No horizontal page scroll (code blocks scroll inside themselves). Respect safe areas.
5. **Plain English UI copy.** Short sentences, everyday words. The user's first language isn't English.
6. **TypeScript strict, no `any`** except at the Pyodide boundary (typed wrapper around it). Zod is the single source of truth for content types.
7. **Accessibility and both themes** for every new screen: VoiceOver labels, visible focus, light and dark colours from tokens.
8. **No native dialogs** (`alert`, `confirm`, `prompt`). Use in-app sheets.
9. **Don't change the learning rules** (rating mapping, planner caps, content rules) silently. Propose the change and wait.
10. Pin dependency versions. Check the latest stable version with `npm view <pkg> version` before adding one, and adapt to its current API (Tailwind 4, Zod 4, Vite 8 and Pyodide 314.x differ from older tutorials).

## Code conventions
- React function components + hooks. One component per file in `src/cards`, `src/components`, `src/screens`.
- Pure logic (grading, planner, scheduler mapping, content building) lives outside components and has unit tests.
- Dexie access only via `src/db/db.ts` repository functions. Zustand stores hold UI and session state, not persisted copies of the DB.
- Names: `camelCase` for variables, `PascalCase` for components and types, `kebab-case` for content ids (`<topic>-<type>-<slug>`).
- Python in `python/` and in content follows PEP 8, 4-space indents, double quotes, and lines of at most 60 characters in cards.

## Definition of done (every phase)
- `npm run lint`, `npm test`, `npm run build` and the content validator all pass. E2E tests for the phase pass.
- The phase checklist in `PHASES.md` is ticked.
- There's a manual iPhone test list for anything automated tests can't prove (keyboard, Home Screen install, share sheet, offline).

## Context about the user (for tone and content)
Bati is a CS graduate and Java developer, preparing for a Junior DevOps Engineer (Voice) role at a Dutch telecom operator. He learns best from concrete, worked examples with real numbers, and from short, continuous explanations, one idea at a time. He has a strong security mindset: keep the trust boundaries explicit.
