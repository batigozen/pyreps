import { describe, expect, it } from "vitest";
import {
  fillBlanks,
  gradeFill,
  gradeMcq,
  gradePredict,
  gradePredictChoice,
  gradeSpotBug,
  normaliseOutput,
  spotBugFix,
} from "../../src/cards/grading.ts";
import type { FillCard, McqCard, PredictCard, SpotBugCard } from "../../src/content/schema.ts";

const base = { topic: "dicts", level: 1, prompt: "p", explain: "e" } as const;

describe("normaliseOutput", () => {
  it.each([
    ["trailing spaces per line", "a  \nb\t", "a\nb"],
    ["Windows line ends", "a\r\nb\r\n", "a\nb"],
    ["blank lines at both ends", "\n\na\nb\n\n", "a\nb"],
    ["iOS curly quotes", "{‘200’: 3, “x”: 1}", `{'200': 3, "x": 1}`],
    ["iOS dash and ellipsis", "—namespace …", "--namespace ..."],
  ])("handles %s", (_name, input, expected) => {
    expect(normaliseOutput(input)).toBe(expected);
  });

  it("keeps leading spaces and blank lines inside the output", () => {
    expect(normaliseOutput("  a\n\n  b")).toBe("  a\n\n  b");
  });
});

describe("gradePredict", () => {
  const card: PredictCard = {
    ...base,
    id: "dicts-predict-x",
    type: "predict",
    code: "print(1)",
    answer: "None unknown True\n",
    options: ["None unknown True", "a", "b"],
  };

  it("accepts the exact output with harmless whitespace", () => {
    expect(gradePredict(card, "None unknown True   \n")).toBe(true);
  });

  it("is strict about case, inner spaces and quotes", () => {
    expect(gradePredict(card, "none unknown true")).toBe(false);
    expect(gradePredict(card, "None  unknown True")).toBe(false);
    expect(gradePredict(card, "'None' unknown True")).toBe(false);
  });

  it("compares a picked option with the answer", () => {
    expect(gradePredictChoice({ ...card, answer: "a" }, "a")).toBe(true);
    expect(gradePredictChoice({ ...card, answer: "a" }, "b")).toBe(false);
  });
});

describe("gradeMcq", () => {
  const card: McqCard = {
    ...base,
    id: "dicts-mcq-x",
    type: "mcq",
    options: ["a", "b", "c"],
    correct: 1,
  };
  it("checks the index", () => {
    expect(gradeMcq(card, 1)).toBe(true);
    expect(gradeMcq(card, 0)).toBe(false);
  });
});

describe("gradeFill", () => {
  const card: FillCard = {
    ...base,
    id: "dicts-fill-x",
    type: "fill",
    code: "x.____(k, ____)",
    blanks: [
      { answer: "get", options: ["get", "pop", "items"] },
      { answer: "0", options: ["0", "1", "None"] },
    ],
  };

  it("needs every blank right", () => {
    expect(gradeFill(card, ["get", "0"])).toEqual({ correct: true, blanks: [true, true] });
  });

  it("counts partly right as wrong, and says which blanks were right", () => {
    expect(gradeFill(card, ["get", "1"])).toEqual({ correct: false, blanks: [true, false] });
    expect(gradeFill(card, ["get", null])).toEqual({ correct: false, blanks: [true, false] });
  });

  it("fills blanks in order", () => {
    expect(fillBlanks(card.code, ["get", "0"])).toBe("x.get(k, 0)");
    expect(fillBlanks(card.code, ["get"])).toBe("x.get(k, ____)");
  });
});

describe("spot_bug", () => {
  const card: SpotBugCard = {
    ...base,
    id: "dicts-spotbug-x",
    type: "spot_bug",
    code: "a = 1\nb = a + '1'\nprint(b)\n",
    bug_line: 2,
    fixed_code: "a = 1\nb = a + 1\nprint(b)\n",
  };

  it("checks the tapped line", () => {
    expect(gradeSpotBug(card, 2)).toBe(true);
    expect(gradeSpotBug(card, 3)).toBe(false);
  });

  it("finds the changed line for the diff", () => {
    expect(spotBugFix(card)).toEqual({ line: 2, before: "b = a + '1'", after: "b = a + 1" });
  });
});
