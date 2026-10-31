// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
  files?: Record<string, string>;
};

// CONTENT.md rule 10: read-only cards may show code that only runs on a real machine.
const CPYTHON_ONLY = "cpython-only";

// Read from disk each run: a cached import.meta.glob can miss a new topic file.
const contentDir = fileURLToPath(new URL("../../content/", import.meta.url));
const readYaml = (dir: string) =>
  readdirSync(join(contentDir, dir))
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => readFileSync(join(contentDir, dir, name), "utf8"));

const cards = readYaml("cards").flatMap((text) => parse(text) as Card[]);
const steps = readYaml("projects").flatMap((text) => {
  const project = parse(text) as { files: Record<string, string>; steps: Card[] };
  return project.steps.map((step) => ({ ...step, type: "write", files: project.files }));
});

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
        const options = { mode: "test", tests: card.tests ?? "", files: card.files } as const;
        const solved = run(card.solution ?? "", options);
        expect(solved.error).toBeNull();
        expect(solved.checks?.failures).toEqual([]);
        const starter = run(card.starter ?? "", options);
        expect(starter.checks?.passed ?? false).toBe(false);
        break;
      }
      default:
        throw new Error(`unknown card type ${String(card.type)}`);
    }
  });
});
