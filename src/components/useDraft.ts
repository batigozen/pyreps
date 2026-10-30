import { useEffect, useRef, useState } from "react";
import { loadDraft, saveDraft } from "../db/db.ts";

const SAVE_DELAY_MS = 400;

/** Code that is saved on the phone while the user types. `null` while loading. */
export function useDraft(id: string, fallback: string) {
  const [code, setCode] = useState<string | null>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadDraft(id)
      .catch(() => undefined)
      .then((saved) => {
        if (alive) setCode(saved ?? fallback);
      });
    return () => {
      alive = false;
    };
  }, [id, fallback]);

  useEffect(() => {
    if (code === null || pending.current === null) return;
    const value = pending.current;
    const timer = setTimeout(() => {
      pending.current = null;
      void saveDraft(id, value);
    }, SAVE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      // Leaving the screen must not lose the last few key presses.
      if (pending.current !== null) void saveDraft(id, pending.current);
    };
  }, [id, code]);

  const update = (next: string) => {
    pending.current = next;
    setCode(next);
  };

  return [code, update] as const;
}
