import { describe, expect, it } from "vitest";
import {
  History,
  insertCloser,
  insertPair,
  moveCaret,
  newline,
  smartBackspace,
  tab,
  type EditState,
} from "../../src/components/editing.ts";

/** Write the state with `|` as the caret, or `[` `]` around a selection. */
function at(marked: string): EditState {
  if (marked.includes("[")) {
    const start = marked.indexOf("[");
    const end = marked.indexOf("]") - 1;
    return { text: marked.replace("[", "").replace("]", ""), start, end };
  }
  const pos = marked.indexOf("|");
  return { text: marked.replace("|", ""), start: pos, end: pos };
}

function show(s: EditState): string {
  if (s.start === s.end) return s.text.slice(0, s.start) + "|" + s.text.slice(s.start);
  return `${s.text.slice(0, s.start)}[${s.text.slice(s.start, s.end)}]${s.text.slice(s.end)}`;
}

describe("brackets and quotes", () => {
  it("adds the pair and puts the caret inside", () => {
    expect(show(insertPair(at("print|"), "("))).toBe("print(|)");
    expect(show(insertPair(at("x = |"), "{"))).toBe("x = {|}");
    expect(show(insertPair(at("x = |"), '"'))).toBe('x = "|"');
  });

  it("wraps a selection", () => {
    expect(show(insertPair(at("x = [rows]"), "("))).toBe("x = ([rows])");
  });

  it("steps over a closing bracket or quote that is already there", () => {
    expect(show(insertCloser(at("f(x|)"), ")"))).toBe("f(x)|");
    expect(show(insertCloser(at("f(x|"), ")"))).toBe("f(x)|");
    expect(show(insertPair(at('"abc|"'), '"'))).toBe('"abc"|');
  });
});

describe("Enter", () => {
  it("keeps the indent of the line", () => {
    expect(show(newline(at("    x = 1|")))).toBe("    x = 1\n    |");
  });

  it("adds a level after a colon, also with a comment after it", () => {
    expect(show(newline(at("for r in rows:|")))).toBe("for r in rows:\n    |");
    expect(show(newline(at("    if ok:  # yes|")))).toBe("    if ok:  # yes\n        |");
  });

  it("does not add a level for a colon inside the line", () => {
    expect(show(newline(at('d = {"a": 1}|')))).toBe('d = {"a": 1}\n|');
  });
});

describe("Tab and Backspace", () => {
  it("Tab goes to the next multiple of 4", () => {
    expect(show(tab(at("|x")))).toBe("    |x");
    expect(show(tab(at("ab|")))).toBe("ab  |");
  });

  it("Backspace in the indent removes one level", () => {
    expect(show(smartBackspace(at("    if x:\n        |")) ?? at("|"))).toBe("    if x:\n    |");
    expect(show(smartBackspace(at("      |")) ?? at("|"))).toBe("    |");
  });

  it("Backspace after code is left to the browser", () => {
    expect(smartBackspace(at("    x|"))).toBeNull();
    expect(smartBackspace(at("|"))).toBeNull();
    expect(smartBackspace(at("[    ]"))).toBeNull();
  });
});

describe("caret moves", () => {
  it("moves one step and stops at the ends", () => {
    expect(show(moveCaret(at("ab|c"), -1))).toBe("a|bc");
    expect(show(moveCaret(at("abc|"), 1))).toBe("abc|");
    expect(show(moveCaret(at("|abc"), -1))).toBe("|abc");
  });

  it("collapses a selection to one side", () => {
    expect(show(moveCaret(at("a[bc]d"), 1))).toBe("abc|d");
  });
});

describe("History", () => {
  it("joins fast typing into one undo step", () => {
    const history = new History();
    history.record(at("|"), true, 1000);
    history.record(at("a|"), true, 1200);
    history.record(at("ab|"), true, 1400);
    expect(show(history.undo() ?? at("x|"))).toBe("|");
    expect(history.canUndo).toBe(false);
  });

  it("keeps symbol keys and pauses as separate steps", () => {
    const history = new History();
    history.record(at("|"), true, 1000);
    history.record(at("a|"), true, 5000);
    history.record(at("ab|"), false, 5100);
    expect(show(history.undo() ?? at("x|"))).toBe("ab|");
    expect(show(history.undo() ?? at("x|"))).toBe("a|");
    expect(show(history.undo() ?? at("x|"))).toBe("|");
  });

  it("forgets the oldest steps past the limit", () => {
    const history = new History(2);
    for (const text of ["a", "b", "c"]) history.record(at(`${text}|`), false);
    expect(history.undo()?.text).toBe("c");
    expect(history.undo()?.text).toBe("b");
    expect(history.undo()).toBeUndefined();
  });
});
