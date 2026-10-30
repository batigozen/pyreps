export type SymbolKey = { label: string; name: string; action: () => void; disabled?: boolean };

type Props = { keys: SymbolKey[]; pinnedStart: SymbolKey; pinnedEnd: SymbolKey; bottom: number };

function Key({ item }: { item: SymbolKey }) {
  return (
    <button
      type="button"
      aria-label={item.name}
      disabled={item.disabled}
      // Keep the focus (and so the keyboard) in the editor. Blocking pointerdown instead
      // would also cancel the click on touch screens.
      onMouseDown={(event) => event.preventDefault()}
      onClick={item.action}
      className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface px-2 font-mono text-[18px] disabled:opacity-40"
    >
      {item.label}
    </button>
  );
}

/** A row of Python symbols that sits right above the on-screen keyboard. */
export default function SymbolBar({ keys, pinnedStart, pinnedEnd, bottom }: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Symbols"
      data-testid="symbol-bar"
      className="symbol-bar fixed inset-x-0 z-30 border-t border-border bg-surface-2"
      style={{ bottom }}
      data-keyboard={bottom > 0 ? "open" : "closed"}
    >
      <div className="mx-auto flex max-w-[640px] items-center gap-1.5 px-2 py-1.5">
        <Key item={pinnedStart} />
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {keys.map((item) => (
            <Key key={item.name} item={item} />
          ))}
        </div>
        <Key item={pinnedEnd} />
      </div>
    </div>
  );
}
