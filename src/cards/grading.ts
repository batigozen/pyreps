import type {
  FillCard,
  McqCard,
  ParsonsCard,
  PredictCard,
  SpotBugCard,
} from "../content/schema.ts";
import { BLANK, codeLines } from "../content/checks.ts";

/**
 * Same rules as `norm` in scripts/validate_content.py, plus iOS Smart Punctuation:
 * the iPhone keyboard may turn ' " -- ... into curly quotes, a dash or an ellipsis.
 */
export function normaliseOutput(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "--")
    .replace(/…/g, "...")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

export const gradePredict = (card: PredictCard, typed: string) =>
  normaliseOutput(typed) === normaliseOutput(card.answer);

export const gradePredictChoice = (card: PredictCard, option: string) => option === card.answer;

export const gradeMcq = (card: McqCard, index: number) => index === card.correct;

export type FillGrade = { correct: boolean; blanks: boolean[] };

/** Every blank must be right. Partly right counts as wrong, but says which blanks were right. */
export function gradeFill(card: FillCard, picks: readonly (string | null)[]): FillGrade {
  const blanks = card.blanks.map((blank, i) => picks[i] === blank.answer);
  return { correct: blanks.every(Boolean), blanks };
}

export const gradeSpotBug = (card: SpotBugCard, line: number) => line === card.bug_line;

/** The one line the fix changes (the build checks there is exactly one). */
export function spotBugFix(card: SpotBugCard) {
  const index = card.bug_line - 1;
  return {
    line: card.bug_line,
    before: codeLines(card.code)[index] ?? "",
    after: codeLines(card.fixed_code)[index] ?? "",
  };
}

/** Fills the blanks in order. A missing value keeps the blank. */
export function fillBlanks(code: string, values: readonly (string | null)[]): string {
  let i = 0;
  return code.replaceAll(BLANK, () => values[i++] ?? BLANK);
}

export type ParsonsLine = { text: string; indent: number };

const indentOf = (line: string) => line.length - line.trimStart().length;

/** The expected program: each line without its leading spaces, plus its indent level. */
export const parsonsTarget = (card: ParsonsCard): ParsonsLine[] =>
  card.lines.map((line) => ({ text: line.trimStart(), indent: indentOf(line) / 4 }));

/** Same lines, same order, same indents. A distractor anywhere makes it wrong. */
export function gradeParsons(card: ParsonsCard, placed: readonly ParsonsLine[]): boolean {
  const target = parsonsTarget(card);
  return (
    placed.length === target.length &&
    placed.every((line, i) => line.text === target[i]?.text && line.indent === target[i]?.indent)
  );
}

export type PoolItem = { key: number; text: string };

function seededRandom(seed: string) {
  let h = 2166136261;
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Lines and distractors mixed. The same card always gives the same order, never the answer. */
export function parsonsPool(card: ParsonsCard): PoolItem[] {
  const items = [...card.lines, ...(card.distractors ?? [])].map((line, key) => ({
    key,
    text: line.trimStart(),
  }));
  const random = seededRandom(card.id);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j] as PoolItem, items[i] as PoolItem];
  }
  // If the mix happens to start with the answer in order, rotate it once.
  const inOrder = card.lines.every((line, i) => items[i]?.text === line.trimStart());
  return inOrder ? [...items.slice(1), ...items.slice(0, 1)] : items;
}

/** Where a newly placed line starts: like the line above, one deeper after ":". */
export function suggestIndent(previous: ParsonsLine | undefined): number {
  if (!previous) return 0;
  return Math.min(4, previous.indent + (previous.text.trimEnd().endsWith(":") ? 1 : 0));
}
