// Pure editing rules for the mobile code editor. Positions are string offsets.

export type EditState = { text: string; start: number; end: number };

export const INDENT = 4;

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
const CLOSERS = new Set([")", "]", "}", '"', "'"]);

const lineStart = (text: string, pos: number) => text.lastIndexOf("\n", pos - 1) + 1;

/** Replaces the selection with `insert` and puts the caret `caret` characters into it. */
export function replaceSelection(s: EditState, insert: string, caret = insert.length): EditState {
  const text = s.text.slice(0, s.start) + insert + s.text.slice(s.end);
  const pos = s.start + caret;
  return { text, start: pos, end: pos };
}

/** An opening bracket or quote adds its pair, or wraps the selection. */
export function insertPair(s: EditState, open: string): EditState {
  const close = PAIRS[open] ?? open;
  if (s.start !== s.end) {
    const inner = s.text.slice(s.start, s.end);
    const next = replaceSelection(s, open + inner + close);
    return { ...next, start: s.start + 1, end: s.start + 1 + inner.length };
  }
  // A quote right before the same quote steps over it, like a closing bracket.
  if (CLOSERS.has(open) && s.text[s.start] === open)
    return { ...s, start: s.start + 1, end: s.start + 1 };
  return replaceSelection(s, open + close, 1);
}

/** A closing bracket steps over the same character instead of adding a second one. */
export function insertCloser(s: EditState, close: string): EditState {
  if (s.start === s.end && s.text[s.start] === close) {
    return { ...s, start: s.start + 1, end: s.start + 1 };
  }
  return replaceSelection(s, close);
}

/** Enter keeps the line's indent, and adds one level after a line that ends with ":". */
export function newline(s: EditState): EditState {
  const line = s.text.slice(lineStart(s.text, s.start), s.start);
  let indent = /^ */.exec(line)?.[0].length ?? 0;
  const code = line.replace(/#.*$/, "").trimEnd();
  if (code.endsWith(":")) indent += INDENT;
  return replaceSelection(s, `\n${" ".repeat(indent)}`);
}

/** Tab inserts spaces up to the next multiple of 4. */
export function tab(s: EditState): EditState {
  const column = s.start - lineStart(s.text, s.start);
  return replaceSelection(s, " ".repeat(INDENT - (column % INDENT)));
}

/** Backspace in the leading spaces removes one indent level. Null: let the browser do it. */
export function smartBackspace(s: EditState): EditState | null {
  if (s.start !== s.end || s.start === 0) return null;
  const before = s.text.slice(lineStart(s.text, s.start), s.start);
  if (!before || !/^ +$/.test(before)) return null;
  const remove = before.length % INDENT || INDENT;
  const pos = s.start - remove;
  return { text: s.text.slice(0, pos) + s.text.slice(s.start), start: pos, end: pos };
}

export function moveCaret(s: EditState, delta: -1 | 1): EditState {
  let pos: number;
  if (s.start !== s.end) pos = delta < 0 ? s.start : s.end;
  else pos = Math.min(s.text.length, Math.max(0, s.start + delta));
  return { ...s, start: pos, end: pos };
}

/** Undo history. Fast typing in one place is one step, like in other editors. */
export class History {
  private past: EditState[] = [];
  private lastPushAt = 0;
  private readonly limit: number;

  constructor(limit = 200) {
    this.limit = limit;
  }

  /** Remember `before`, the state just before a change. */
  record(before: EditState, typing: boolean, now = Date.now()) {
    const merge = typing && now - this.lastPushAt < 1000 && this.past.length > 0;
    this.lastPushAt = now;
    if (merge) return;
    this.past.push(before);
    if (this.past.length > this.limit) this.past.shift();
  }

  /** Stops the current typing run, so the next change is its own step. */
  cut() {
    this.lastPushAt = 0;
  }

  undo(): EditState | undefined {
    this.lastPushAt = 0;
    return this.past.pop();
  }

  get canUndo() {
    return this.past.length > 0;
  }
}
