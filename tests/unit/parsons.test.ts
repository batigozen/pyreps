import { describe, expect, it } from "vitest";
import {
  gradeParsons,
  parsonsPool,
  parsonsTarget,
  suggestIndent,
} from "../../src/cards/grading.ts";
import type { ParsonsCard } from "../../src/content/schema.ts";

const card: ParsonsCard = {
  id: "dicts-parsons-x",
  type: "parsons",
  topic: "dicts",
  level: 2,
  prompt: "p",
  explain: "e",
  lines: [
    "counts = {}",
    "for code in codes:",
    "    if code:",
    "        counts[code] = 1",
    "print(counts)",
  ],
  distractors: ["counts = []"],
};

const right = [
  { text: "counts = {}", indent: 0 },
  { text: "for code in codes:", indent: 0 },
  { text: "if code:", indent: 1 },
  { text: "counts[code] = 1", indent: 2 },
  { text: "print(counts)", indent: 0 },
];

describe("gradeParsons", () => {
  it("reads the expected indent from the spaces", () => {
    expect(parsonsTarget(card)).toEqual(right);
  });

  it("accepts the right lines, order and indents", () => {
    expect(gradeParsons(card, right)).toBe(true);
  });

  it("rejects a wrong indent, a wrong order or a distractor", () => {
    expect(
      gradeParsons(
        card,
        right.map((l, i) => (i === 4 ? { ...l, indent: 1 } : l)),
      ),
    ).toBe(false);
    expect(gradeParsons(card, [right[1], right[0], ...right.slice(2)] as typeof right)).toBe(false);
    expect(gradeParsons(card, [{ text: "counts = []", indent: 0 }, ...right.slice(1)])).toBe(false);
    expect(gradeParsons(card, right.slice(0, 4))).toBe(false);
  });
});

describe("parsonsPool", () => {
  it("has every line and distractor once, without indent", () => {
    const pool = parsonsPool(card);
    expect(pool.map((item) => item.text).sort()).toEqual(
      [...right.map((l) => l.text), "counts = []"].sort(),
    );
  });

  it("is the same every time and never starts in the right order", () => {
    expect(parsonsPool(card)).toEqual(parsonsPool(card));
    for (let i = 0; i < 50; i++) {
      const pool = parsonsPool({ ...card, id: `dicts-parsons-${i}`, distractors: [] });
      expect(pool.map((item) => item.text)).not.toEqual(right.map((l) => l.text));
    }
  });
});

describe("suggestIndent", () => {
  it("follows the line above, one deeper after a colon", () => {
    expect(suggestIndent(undefined)).toBe(0);
    expect(suggestIndent({ text: "x = 1", indent: 1 })).toBe(1);
    expect(suggestIndent({ text: "for r in rows:", indent: 1 })).toBe(2);
    expect(suggestIndent({ text: "if x:", indent: 4 })).toBe(4);
  });
});
