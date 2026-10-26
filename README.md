# PyReps doc pack

Everything Claude Code needs to build PyReps, a free iPhone PWA for daily Python practice.

| File | What it is |
|---|---|
| `CLAUDE.md` | Rules and workflow Claude Code follows in every session |
| `PRD.md` | What the product is, for whom, and why (with the learning research behind it) |
| `ARCHITECTURE.md` | Stack, folder structure, data model, Python worker, scheduler, PWA, deployment |
| `PHASES.md` | 8 build phases with "done when" criteria (+ optional sync phase) |
| `CONTENT.md` | How cards are written and validated; topic-by-topic coverage plan |
| `PROMPT.md` | The kickoff prompt and follow-up prompts to paste into Claude Code |
| `content/` | `topics.yaml`, 12 seed cards (every type), 1 seed project step |
| `seed/data/` | Sample data: 48 CDRs, SBC log, `kubectl` pods JSON, Prometheus answer |
| `python/voicelab.py` | Helper module used both in the app and by the validator |
| `scripts/validate_content.py` | Runs every card with real Python and rejects wrong answers (working, tested) |

## Start
1. Create an empty GitHub repo called `pyreps` and put these files in it.
2. Open Claude Code in that folder and paste prompt 1 from `PROMPT.md`.
3. After each phase, test on your iPhone: open `https://<your-github-name>.github.io/pyreps/` in Safari, then Share → Add to Home Screen.
