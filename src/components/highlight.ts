// A tiny Python highlighter for read-only code. It only colours; it never parses.

export type TokenType = "kw" | "const" | "builtin" | "str" | "num" | "com" | "deco" | "plain";
export type Token = { type: TokenType | "blank"; text: string; blank?: number };

const KEYWORDS = new Set(
  (
    "and as assert async await break class continue def del elif else except finally for " +
    "from global if import in is lambda nonlocal not or pass raise return try while with " +
    "yield match case"
  ).split(" "),
);
const CONSTANTS = new Set(["True", "False", "None", "self", "cls"]);
const BUILTINS = new Set(
  (
    "abs all any bool bytes callable dict dir divmod enumerate filter float format frozenset " +
    "getattr hasattr hash hex id input int isinstance issubclass iter len list map max min " +
    "next object open ord print range repr reversed round set setattr sorted str sum super " +
    "tuple type zip Exception ValueError KeyError TypeError IndexError RuntimeError " +
    "ZeroDivisionError SystemExit StopIteration AttributeError OSError NameError"
  ).split(" "),
);

const SCANNER = new RegExp(
  [
    /(?<com>#[^\n]*)/,
    /(?<str>(?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))/,
    /(?<deco>@[A-Za-z_][\w.]*)/,
    /(?<num>\b(?:0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?j?)\b)/,
    /(?<name>[A-Za-z_]\w*)/,
  ]
    .map((part) => part.source)
    .join("|"),
  "g",
);

function scan(code: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of code.matchAll(SCANNER)) {
    if (match.index > last) tokens.push({ type: "plain", text: code.slice(last, match.index) });
    const groups = match.groups ?? {};
    const text = match[0];
    let type: TokenType = "plain";
    if (groups.com !== undefined) type = "com";
    else if (groups.str !== undefined) type = "str";
    else if (groups.deco !== undefined) type = "deco";
    else if (groups.num !== undefined) type = "num";
    else if (KEYWORDS.has(text)) type = "kw";
    else if (CONSTANTS.has(text)) type = "const";
    else if (BUILTINS.has(text)) type = "builtin";
    tokens.push({ type, text });
    last = match.index + text.length;
  }
  if (last < code.length) tokens.push({ type: "plain", text: code.slice(last) });
  return tokens;
}

/** Tokens per line. With `blank`, each occurrence of it becomes a numbered blank token. */
export function highlight(code: string, blank?: string): Token[][] {
  const lines: Token[][] = [[]];
  let blankIndex = 0;
  const push = (token: Token) => {
    const parts = token.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1]?.push({ ...token, text: part });
    });
  };
  for (const token of scan(code.replace(/\n+$/, ""))) {
    if (!blank || !token.text.includes(blank)) {
      push(token);
      continue;
    }
    token.text.split(blank).forEach((part, i) => {
      if (i > 0) push({ type: "blank", text: blank, blank: blankIndex++ });
      if (part) push({ ...token, text: part });
    });
  }
  return lines;
}
