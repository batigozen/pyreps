# Prompts for Claude Code

## 1. Kickoff (paste this first, in the empty repo that contains this doc pack)

```
You're building PyReps, a free offline-first PWA that I'll use on my iPhone 16 to practise Python every day.

Read these files completely before doing anything: CLAUDE.md, PRD.md, ARCHITECTURE.md, PHASES.md, CONTENT.md. Also look at the provided starter material: seed/data/* (sample datasets), python/voicelab.py (helper module), scripts/validate_content.py (content validator, already working), content/topics.yaml, content/cards/dicts.yaml, content/cards/unpack.yaml and content/projects/sbc-log-parser.yaml (seed cards; every card type has an example).

Then:
1. Run `pip install pyyaml && python3 scripts/validate_content.py --verbose` and confirm the 13 seed cards pass.
2. Tell me in at most 15 bullet points: your understanding of the product, any conflicts or gaps you see in the documents, and the exact package versions you plan to install (check them with npm view).
3. Wait for my answer. After I approve, do Phase 0 only, following CLAUDE.md "How to work", and stop at the end with the summary and the manual iPhone test list.

Rules that matter most: €0 total, user code only in the Pyodide worker, never hand-write expected outputs (always run the validator), mobile-first at 393×852, plain English UI text.
```

## 2. Continue to the next phase

```
Phase <N> approved. Notes from my iPhone test: <what worked / what didn't>.
Fix anything I reported first, then start Phase <N+1>. Post the plan before coding, and stop at the end with the summary and the manual iPhone test list.
```

## 3. Authoring a topic in Phase 5 (one message per topic keeps quality high)

```
Write the cards for topic `<topic>` following CONTENT.md exactly: about 20 cards, mix 6 predict / 3 mcq / 3 fill / 3 spot_bug / 3 parsons / 2 write, covering every bullet in the topic's "must cover" row. Use the voice-lab data and voicelab helpers. Run `.venv/bin/python scripts/validate_content.py --topic <topic>` and `npm test` until both report 0 problems. Never type an expected output by hand; run the code and copy the real output. Then show me 3 of the cards (one predict, one parsons, one write) rendered as they'd appear on the phone, and commit.
```

## 4. When something is off on the phone

```
On my iPhone (Home Screen app, iOS <version>): <exact steps> → <what I saw> (screenshot attached). Expected: <...>.
Find the cause before changing code. Tell me the cause in 2–3 sentences, then fix it, add a test if it can be automated, and give me the manual re-test steps.
```

## 5. Adding cards later from new lessons

```
I just finished <lesson/topic>. Here is what it taught: <paste key points or code>. Add 10 cards for it to the right topic file (or a new topic, and update topics.yaml), following CONTENT.md, validated, about 70% tap-only.
```
