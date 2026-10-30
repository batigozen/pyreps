import type { ReactNode } from "react";
import { highlight, type Token } from "./highlight.ts";

export type LineMark = "selected" | "ok" | "bad";

type Selectable = {
  label: string;
  selected: number | null;
  onSelect: (line: number) => void;
  marks?: Partial<Record<number, LineMark>>;
  disabled?: boolean;
};

type Props = {
  code: string;
  label?: string;
  /** Fill cards: each blank (`____`) is drawn by this function. */
  renderBlank?: (index: number) => ReactNode;
  /** Spot-the-bug cards: every line is a big button. */
  selectable?: Selectable;
};

const MARK_CLASS: Record<LineMark, string> = {
  selected: "bg-accent/15 outline-2 -outline-offset-2 outline-accent",
  ok: "bg-ok/15",
  bad: "bg-bad/15",
};

function renderTokens(tokens: Token[], renderBlank?: (index: number) => ReactNode) {
  return tokens.map((token, i) =>
    token.type === "blank" ? (
      <span key={i}>{renderBlank?.(token.blank ?? 0) ?? token.text}</span>
    ) : token.type === "plain" ? (
      token.text
    ) : (
      <span key={i} className={`tok-${token.type}`}>
        {token.text}
      </span>
    ),
  );
}

export default function CodeView({ code, label = "Code", renderBlank, selectable }: Props) {
  const lines = highlight(code, renderBlank ? "____" : undefined);
  const gutter = String(lines.length).length;

  const lineContent = (tokens: Token[], n: number) => (
    <>
      <span
        aria-hidden="true"
        className="shrink-0 pr-3 pl-3 text-right text-muted select-none"
        style={{ width: `${gutter + 2.5}ch` }}
      >
        {n}
      </span>
      <span className="pr-4 whitespace-pre">{renderTokens(tokens, renderBlank)}</span>
    </>
  );

  return (
    <div
      className="overflow-x-auto rounded-xl border border-border bg-surface font-mono text-[15px] leading-relaxed"
      role={selectable ? "radiogroup" : "group"}
      aria-label={selectable?.label ?? label}
    >
      <div className="min-w-max py-2">
        {lines.map((tokens, i) => {
          const n = i + 1;
          if (!selectable) {
            return (
              <div key={n} className="flex">
                {lineContent(tokens, n)}
              </div>
            );
          }
          const mark = selectable.marks?.[n] ?? (selectable.selected === n ? "selected" : null);
          const text = tokens.map((token) => token.text).join("");
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selectable.selected === n}
              aria-label={`Line ${n}: ${text.trim() || "empty"}`}
              disabled={selectable.disabled}
              onClick={() => selectable.onSelect(n)}
              className={`flex min-h-11 w-full items-center text-left ${mark ? MARK_CLASS[mark] : ""}`}
            >
              {lineContent(tokens, n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
