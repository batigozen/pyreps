import { describe, expect, it } from "vitest";
import { highlight, type Token } from "../../src/components/highlight.ts";
import { splitInlineCode } from "../../src/components/inline.ts";

const types = (line: Token[] | undefined) =>
  (line ?? []).filter((t) => t.text.trim()).map((t) => `${t.type}:${t.text.trim()}`);

describe("highlight", () => {
  it("colours keywords, builtins, strings, numbers and comments", () => {
    const [line] = highlight('for code in codes:  # count "x"\n');
    expect(types(line)).toEqual([
      "kw:for",
      "plain:code",
      "kw:in",
      "plain:codes",
      "plain::",
      'com:# count "x"',
    ]);
    expect(types(highlight('print(f"{v:.0%}", 0.4, None)')[0])).toEqual([
      "builtin:print",
      "plain:(",
      'str:f"{v:.0%}"',
      "plain:,",
      "num:0.4",
      "plain:,",
      "const:None",
      "plain:)",
    ]);
  });

  it("keeps one entry per line, also inside a triple-quoted string", () => {
    const lines = highlight('def f():\n    """a\n    b"""\n    return 1\n');
    expect(lines).toHaveLength(4);
    expect(lines.map((line) => line.map((t) => t.text).join(""))).toEqual([
      "def f():",
      '    """a',
      '    b"""',
      "    return 1",
    ]);
    expect(lines[2]?.find((t) => t.text.includes('b"""'))?.type).toBe("str");
  });

  it("keeps identifiers with digits whole", () => {
    expect(types(highlight("c1001 = 2")[0])).toEqual(["plain:c1001", "plain:=", "num:2"]);
  });

  it("numbers the blanks, even when glued to a name", () => {
    const [line] = highlight("connect(____settings, x.____(1))", "____");
    const blanks = (line ?? []).filter((t) => t.type === "blank").map((t) => t.blank);
    expect(blanks).toEqual([0, 1]);
    expect((line ?? []).map((t) => t.text).join("")).toBe("connect(____settings, x.____(1))");
  });

  it("keeps empty lines", () => {
    expect(highlight("a = 1\n\nb = 2")).toHaveLength(3);
  });
});

describe("splitInlineCode", () => {
  it("marks text in backticks as code", () => {
    expect(splitInlineCode("Use `in` to check keys")).toEqual([
      { code: false, text: "Use " },
      { code: true, text: "in" },
      { code: false, text: " to check keys" },
    ]);
  });

  it("leaves an unmatched backtick as plain text", () => {
    expect(splitInlineCode("a ` b")).toEqual([{ code: false, text: "a ` b" }]);
  });
});
