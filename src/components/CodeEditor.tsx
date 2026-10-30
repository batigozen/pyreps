import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent } from "react";
import {
  History,
  insertCloser,
  insertPair,
  moveCaret,
  newline,
  replaceSelection,
  smartBackspace,
  tab,
  type EditState,
} from "./editing.ts";
import SymbolBar, { type SymbolKey } from "./SymbolBar.tsx";
import { useKeyboardInset } from "./useKeyboardInset.ts";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export default function CodeEditor({ id, label, value, onChange, readOnly = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const history = useRef(new History());
  const pendingSelection = useRef<[number, number] | null>(null);
  const valueRef = useRef(value);
  const [canUndo, setCanUndo] = useState(false);
  const [focused, setFocused] = useState(false);
  const keyboardInset = useKeyboardInset(focused);

  const current = (): EditState => {
    const el = ref.current;
    return { text: valueRef.current, start: el?.selectionStart ?? 0, end: el?.selectionEnd ?? 0 };
  };

  const apply = (next: EditState, typing = false) => {
    const before = current();
    if (next.text !== before.text) {
      history.current.record(before, typing);
      setCanUndo(true);
    }
    pendingSelection.current = [next.start, next.end];
    valueRef.current = next.text;
    onChange(next.text);
    // A caret move without a text change needs no re-render.
    ref.current?.setSelectionRange(next.start, next.end);
  };

  useLayoutEffect(() => {
    // A change from outside (a reset, a loaded draft) can be undone too.
    if (value !== valueRef.current) {
      history.current.record({ text: valueRef.current, start: 0, end: 0 }, false);
      valueRef.current = value;
      setCanUndo(true);
    }
    const selection = pendingSelection.current;
    if (selection && ref.current) ref.current.setSelectionRange(selection[0], selection[1]);
    pendingSelection.current = null;
  }, [value]);

  // beforeinput works for the iOS keyboard too, where keydown is not reliable.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onBeforeInput = (event: InputEvent) => {
      if (el.readOnly) return;
      let next: EditState | null = null;
      if (event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") {
        next = newline(current());
      } else if (event.inputType === "deleteContentBackward") {
        next = smartBackspace(current());
      }
      if (next) {
        event.preventDefault();
        history.current.cut();
        apply(next);
      }
    };
    el.addEventListener("beforeinput", onBeforeInput);
    return () => el.removeEventListener("beforeinput", onBeforeInput);
  });

  const run = (edit: (s: EditState) => EditState) => () => {
    ref.current?.focus();
    history.current.cut();
    apply(edit(current()));
  };

  const undo = () => {
    ref.current?.focus();
    const previous = history.current.undo();
    setCanUndo(history.current.canUndo);
    if (!previous) return;
    pendingSelection.current = [previous.start, previous.end];
    valueRef.current = previous.text;
    onChange(previous.text);
  };

  const symbol = (label: string, name: string, edit: (s: EditState) => EditState): SymbolKey => ({
    label,
    name,
    action: run(edit),
  });
  const text = (char: string, name: string) => symbol(char, name, (s) => replaceSelection(s, char));
  const pair = (char: string, name: string) => symbol(char, name, (s) => insertPair(s, char));
  const closer = (char: string, name: string) => symbol(char, name, (s) => insertCloser(s, char));

  const keys: SymbolKey[] = [
    pair("(", "Brackets"),
    closer(")", "Close bracket"),
    text(":", "Colon"),
    pair('"', "Double quotes"),
    pair("'", "Single quotes"),
    pair("[", "Square brackets"),
    closer("]", "Close square bracket"),
    pair("{", "Curly brackets"),
    closer("}", "Close curly bracket"),
    text("=", "Equals"),
    text("_", "Underscore"),
    text("*", "Star"),
    text(".", "Dot"),
    text(",", "Comma"),
    text("#", "Hash"),
    symbol("←", "Move left", (s) => moveCaret(s, -1)),
    symbol("→", "Move right", (s) => moveCaret(s, 1)),
  ];

  const onBlur = (event: FocusEvent) => {
    if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  const lineCount = value.split("\n").length;

  return (
    <div ref={wrapperRef} onBlur={onBlur}>
      <label htmlFor={id} className="mb-1 block font-bold">
        {label}
      </label>
      <div className="flex overflow-hidden rounded-xl border-2 border-border bg-surface focus-within:border-accent">
        <div
          aria-hidden="true"
          className="shrink-0 border-r border-border py-2 pr-2 pl-3 text-right font-mono text-[16px] leading-normal text-muted select-none"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={ref}
          id={id}
          value={value}
          readOnly={readOnly}
          rows={Math.max(lineCount, 4)}
          wrap="off"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            const el = event.target;
            history.current.record(current(), true);
            setCanUndo(true);
            valueRef.current = el.value;
            onChange(el.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Tab" && !event.shiftKey && !readOnly) {
              event.preventDefault();
              run(tab)();
            }
          }}
          className="code-editor min-w-0 flex-1 resize-none overflow-x-auto bg-transparent px-2 py-2 font-mono text-[16px] leading-normal outline-none"
        />
      </div>
      {focused && !readOnly && (
        <SymbolBar
          keys={keys}
          pinnedStart={symbol("⇥", "Tab", tab)}
          pinnedEnd={{ label: "↶", name: "Undo", action: undo, disabled: !canUndo }}
          bottom={keyboardInset}
        />
      )}
    </div>
  );
}
