# PyReps

A free, offline-first web app for iPhone: short daily Python practice with auto-graded cards and small coding tasks.

**Open it:** https://batigozen.github.io/pyreps/

## Install on iPhone
1. Open **https://batigozen.github.io/pyreps/** in **Safari**. Other browsers can't add it as an app.
2. Tap **Share** (the square with an arrow pointing up).
3. Tap **Add to Home Screen**. You may need to scroll down, or tap **More** first. If you see **Open as Web App**, keep it on.
4. Tap **Add**.
5. Open PyReps from the Home Screen **once while you're online**. It downloads about 14 MB, including Python. Wait for the message "Ready. PyReps now works offline."

After that, it works in airplane mode.

**Updates:** open the app while you're online. If you see "A new version is ready", tap **Reload**.

**Your data:** the Home Screen app keeps its own storage, separate from Safari. Removing the app from the Home Screen also removes your progress. A backup option is planned.

## Run a project in a-Shell
1. Finish a project in the Projects tab (or open the Playground), then tap **Export file**.
2. In the share sheet, tap **Save to Files** and save all the files in one folder, for example On My iPhone › a-Shell.
3. Open [a-Shell](https://holzschu.github.io/a-Shell_iOS/) (free), type `pickFolder`, and choose that folder.
4. Run the script, for example `python3 sbc-log-parser.py` or `python3 voicekit-cli.py report --format json`.

The script needs `voicelab.py` and the data files next to it; they are part of the export.

## Develop
Needs Node 24 (see `.nvmrc`) and Python 3.14.

```bash
npm ci
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
npx playwright install webkit          # once, for the e2e tests

npm run dev -- --host                  # open the Network URL on the iPhone (same Wi-Fi)
npm run lint
npm test                               # vitest
npm run e2e                            # playwright, iPhone 16 profile (builds first)
npm run build
.venv/bin/python scripts/validate_content.py --verbose
```

The dev server has no service worker. To try offline mode on a computer, use `npm run build && npm run preview`.

App icons are generated from `public/icons/icon.svg` with `npm run icons`.

Pushing to `main` runs the checks and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Doc pack
| File | What it is |
|---|---|
| `CLAUDE.md` | Rules and workflow Claude Code follows in every session |
| `PRD.md` | What the product is, for whom, and why (with the learning research behind it) |
| `ARCHITECTURE.md` | Stack, folder structure, data model, Python worker, scheduler, PWA, deployment |
| `PHASES.md` | 8 build phases with "done when" criteria (+ optional sync phase) |
| `CONTENT.md` | How cards are written and validated; topic-by-topic coverage plan |
| `PROMPT.md` | The kickoff prompt and follow-up prompts to paste into Claude Code |
| `content/` | `topics.yaml`, 28 seed cards (every type, 4 topics), 1 seed project step |
| `seed/data/` | Sample data: 48 CDRs, SBC log, `kubectl` pods JSON, Prometheus answer |
| `python/voicelab.py` | Helper module used both in the app and by the validator |
| `scripts/validate_content.py` | Runs every card with real Python and rejects wrong answers |
