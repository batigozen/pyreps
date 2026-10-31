import { useEffect, useId, useRef, type ReactNode } from "react";
import Icon from "./Icon.tsx";

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

/** A bottom sheet built on <dialog>: focus stays inside, Escape and the backdrop close it. */
export default function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="sheet mt-auto mb-0 max-h-[85dvh] w-full max-w-[640px] overflow-y-auto rounded-t-2xl bg-bg p-0 text-fg"
    >
      <div className="sheet-body p-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 id={titleId} className="flex-1 text-[1.25rem] font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-xl text-muted"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
