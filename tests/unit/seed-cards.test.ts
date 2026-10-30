// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { startPython, type TestPython } from "./pyodide.ts";

// The validator proves the cards on CPython. This proves them on the Python the app really runs.
type Blank = { answer: string };
type Card = {
  id: string;
  type?: string;
  code?: string;
  answer?: unknown;
  blanks?: Blank[];
  fixed_code?: string;
  setup?: string;
  lines?: string[];
  expected_output?: string;
  starter?: string;
  tests?: string;
  solution?: string;
  tags?: string[];
};

// CONTENT.md rule 10: read-only cards may show code that only runs on a real machine.
const CPYTHON_ONLY = "cpython-only";

const cardFiles = import.meta.glob<string>("../../content/cards/*.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
});
const projectFiles = import.meta.glob<string>("../../content/projects/*.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
});

const cards = Object.values(cardFiles).flatMap((text) => parse(text) as Card[]);
const steps = Object.values(projectFiles).flatMap((text) =>
  (parse(text) as { steps: Card[] }).steps.map((step) => ({ ...step, type: "write" })),
);

const norm = (text: string) =>
  text
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "");

let run: TestPython;

beforeAll(async () => {
  run = await startPython();
}, 60_000);

function expectOutput(code: string, expected: string | undefined) {
  const result = run(code);
  expect(result.error).toBeNull();
  if (expected !== undefined) expect(norm(result.stdout)).toBe(norm(expected));
}

describe("seed cards in Pyodide", () => {
  it("finds the cards", () => {
    expect(cards.length).toBeGreaterThanOrEqual(28);
    expect(steps.length).toBeGreaterThanOrEqual(1);
  });

  it.each([...cards, ...steps].map((card) => [card.id, card] as const))("%s", (_id, card) => {
    if (card.tags?.includes(CPYTHON_ONLY)) {
      // The app runs write cards, so they must work in Pyodide.
      expect(card.type).not.toBe("write");
      return;
    }
    switch (card.type) {
      case "predict":
        expectOutput(card.code ?? "", String(card.answer));
        break;
      case "mcq":
        // Like the validator: code tagged `raises` is meant to fail.
        if (card.code && !card.tags?.includes("raises")) expectOutput(card.code, undefined);
        break;
      case "fill": {
        let code = card.code ?? "";
        for (const blank of card.blanks ?? []) code = code.replace("____", blank.answer);
        expectOutput(code, card.expected_output);
        break;
      }
      case "spot_bug":
        expectOutput(card.fixed_code ?? "", card.expected_output);
        break;
      case "parsons":
        expectOutput([card.setup ?? "", ...(card.lines ?? [])].join("\n"), card.expected_output);
        break;
      case "write": {
        const solved = run(card.solution ?? "", { mode: "test", tests: card.tests ?? "" });
        expect(solved.error).toBeNull();
        expect(solved.checks?.failures).toEqual([]);
        const starter = run(card.starter ?? "", { mode: "test", tests: card.tests ?? "" });
        expect(starter.checks?.passed ?? false).toBe(false);
        break;
      }
      default:
        throw new Error(`unknown card type ${String(card.type)}`);
    }
  });
});
