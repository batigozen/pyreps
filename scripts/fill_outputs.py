#!/usr/bin/env python3
"""Fill `__RUN__` placeholders in card YAML with the real output of the card's code.

CONTENT.md: never type an expected output by hand. Write the code, put __RUN__ where
the output goes, and run this script. It runs the code exactly like
validate_content.py does and writes what Python printed.

    answer: __RUN__                 predict: stdout of `code`
    - __RUN__                       predict options: the same output, as one option
    expected_output: __RUN__        fill (blanks filled), spot_bug (fixed_code),
                                    parsons (setup + lines)

Usage:  .venv/bin/python scripts/fill_outputs.py content/cards/iter.yaml
It prints each filled output so you can check the distractors still make sense.
"""
import json
import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_content import Runner  # noqa: E402

PLACEHOLDER = "__RUN__"


def code_for(card: dict) -> str:
    t = card["type"]
    if t == "predict":
        return card["code"]
    if t == "fill":
        code = card["code"]
        for blank in card["blanks"]:
            code = code.replace("____", str(blank["answer"]), 1)
        return code
    if t == "spot_bug":
        return card["fixed_code"]
    if t == "parsons":
        return (card.get("setup", "") + "\n" if card.get("setup") else "") + "\n".join(card["lines"])
    raise ValueError(f"{card['id']}: {t} cards have no output to fill")


def as_yaml(key: str, output: str, indent: str) -> str:
    text = output.rstrip("\n")
    if "\n" in text:
        body = "\n".join(f"{indent}  {line}" if line else "" for line in text.split("\n"))
        return f"{indent}{key}: |\n{body}"
    return f"{indent}{key}: {json.dumps(text, ensure_ascii=False)}"


def main() -> int:
    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8")
    cards = yaml.safe_load(text) or []
    starts = [m.start() for m in re.finditer(r"^- id: ", text, re.M)] + [len(text)]
    runner = Runner()
    problems = 0
    try:
        pieces, last = [], 0
        for card, start, end in zip(cards, starts, starts[1:]):
            block = text[start:end]
            if PLACEHOLDER not in block:
                continue
            rc, out, err = runner.run(code_for(card))
            if rc != 0:
                problems += 1
                print(f"✗ {card['id']}: code exits with {rc}: {err.strip().splitlines()[-1:]}")
                continue
            output = out.rstrip("\n")
            block = re.sub(
                rf"^( *)(answer|expected_output): {PLACEHOLDER}$",
                lambda m: as_yaml(m.group(2), output, m.group(1)),
                block,
                flags=re.M,
            )
            block = re.sub(
                rf"^( *)- {PLACEHOLDER}$",
                lambda m: f"{m.group(1)}- {json.dumps(output, ensure_ascii=False)}",
                block,
                flags=re.M,
            )
            pieces.append(text[last:start] + block)
            last = end
            print(f"✓ {card['id']}:\n    " + output.replace("\n", "\n    "))
        pieces.append(text[last:])
        path.write_text("".join(pieces), encoding="utf-8")
    finally:
        runner.cleanup()
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
