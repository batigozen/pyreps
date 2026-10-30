import type { FillCard, McqCard, PredictCard, SpotBugCard } from "../content/schema.ts";
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
