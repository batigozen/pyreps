// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildContent, type SourceFile } from "../../src/content/checks.ts";

const topics: SourceFile = {
  path: "content/topics.yaml",
  data: [{ id: "dicts", module: 2, order: 2, title: "Dictionaries" }],
};

const mcq = {
  id: "dicts-mcq-keyerror",
  type: "mcq",
  topic: "dicts",
  level: 1,
  prompt: "What happens?",
  options: ["None", "KeyError", "''"],
  correct: 1,
  explain: "Square brackets fail loudly.",
};

// Like YAML: a key set to undefined is not there at all.
const asYaml = (data: unknown): unknown => JSON.parse(JSON.stringify(data));

function errorsFor(cards: unknown[]): string[] {
  const file = { path: "content/cards/dicts.yaml", data: asYaml(cards) };
  return buildContent(topics, [file], []).errors;
}

describe("buildContent", () => {
  it("accepts a good card", () => {
    const { content, errors } = buildContent(topics, [{ path: "c.yaml", data: [mcq] }], []);
    expect(errors).toEqual([]);
    expect(content.cards).toHaveLength(1);
    expect(content.topics[0]?.id).toBe("dicts");
  });

  it.each([
    ["an unknown field (a typo)", { ...mcq, explian: "x" }, "explian"],
    ["a missing field", { ...mcq, explain: undefined }, "explain"],
    ["a bad level", { ...mcq, level: 4 }, "level"],
    ["an unknown topic", { ...mcq, topic: "loops", id: "loops-mcq-x" }, 'unknown topic "loops"'],
    ["a wrong id prefix", { ...mcq, id: "dicts-predict-keyerror" }, 'start with "dicts-mcq-"'],
    ["an id that is not kebab-case", { ...mcq, id: "dicts_mcq_x" }, "kebab-case"],
    ["correct past the end", { ...mcq, correct: 3 }, "past the last option"],
    ["too few options", { ...mcq, options: ["a", "b"] }, "3 or 4 options"],
    ["repeated options", { ...mcq, options: ["a", "a", "b"] }, "options repeat"],
  ])("reports %s", (_name, card, message) => {
    const errors = errorsFor([card]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(message);
  });

  it("asks to quote a predict answer that YAML read as a number", () => {
    const card = {
      ...mcq,
      id: "dicts-predict-x",
      type: "predict",
      code: "print(45)",
      answer: 45,
      options: undefined,
      correct: undefined,
    };
    expect(errorsFor([card]).join()).toContain("put it in quotes");
  });

  it("checks fill blanks against the code", () => {
    const fill = {
      ...mcq,
      id: "dicts-fill-x",
      type: "fill",
      code: "counts.____(code, 0)",
      options: undefined,
      correct: undefined,
      blanks: [{ answer: "get", options: ["get", "pop", "items"] }],
    };
    expect(errorsFor([fill])).toEqual([]);
    expect(errorsFor([{ ...fill, code: "counts.get(code, 0)" }]).join()).toContain(
      "code has 0 ____ but there are 1 blanks",
    );
    const badAnswer = { ...fill, blanks: [{ answer: "setdefault", options: ["get", "pop", "x"] }] };
    expect(errorsFor([badAnswer]).join()).toContain("blank 1: answer is not one of its options");
  });

  it("checks that a spot_bug fix changes only the bug line", () => {
    const bug = {
      ...mcq,
      id: "dicts-spotbug-x",
      type: "spot_bug",
      options: undefined,
      correct: undefined,
      code: "a = 1\nb = a + '1'\nprint(b)\n",
      bug_line: 2,
      fixed_code: "a = 1\nb = a + 1\nprint(b)\n",
    };
    expect(errorsFor([bug])).toEqual([]);
    expect(errorsFor([{ ...bug, bug_line: 3 }]).join()).toContain("changes line 2");
    expect(errorsFor([{ ...bug, bug_line: 9 }]).join()).toContain("past the last line");
    expect(errorsFor([{ ...bug, fixed_code: "a = 2\nb = a + 1\nprint(b)\n" }]).join()).toContain(
      "changes line 1, 2",
    );
  });

  it("reports shown code lines over 60 characters", () => {
    const card = { ...mcq, code: `x = "${"a".repeat(60)}"\n` };
    expect(errorsFor([card]).join()).toContain("code line 1 has 66 characters (at most 60)");
  });

  it("reports repeated ids, also across projects", () => {
    const project = {
      id: "sbc-log-parser",
      title: "SBC log parser",
      summary: "s",
      files: {},
      steps: [
        {
          id: "dicts-mcq-keyerror",
          prompt: "p",
          level: 2,
          starter: "x",
          tests: "y",
          hint: "h",
          solution: "z",
          explain: "e",
        },
      ],
    };
    const { errors } = buildContent(
      topics,
      [{ path: "a.yaml", data: [mcq] }],
      [{ path: "p.yaml", data: project }],
    );
    expect(errors).toEqual(["p.yaml :: dicts-mcq-keyerror: id is already used in a.yaml"]);
  });

  it("reports a file that is not a list", () => {
    const { errors } = buildContent(topics, [{ path: "bad.yaml", data: { id: "x" } }], []);
    expect(errors).toEqual(["bad.yaml: must be a YAML list"]);
  });
});
