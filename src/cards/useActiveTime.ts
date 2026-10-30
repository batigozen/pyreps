import { useCallback, useEffect, useRef } from "react";

type Clock = { start: number; hidden: number; hiddenAt: number | null };

/**
 * Time on the card, without the time the app was in the background (a call, another
 * app). The time budgets would be unfair otherwise.
 */
export function useActiveTime(): () => number {
  const clock = useRef<Clock | null>(null);

  useEffect(() => {
    const now = performance.now();
    clock.current = { start: now, hidden: 0, hiddenAt: document.hidden ? now : null };
    const onChange = () => {
      const c = clock.current;
      if (!c) return;
      const at = performance.now();
      if (document.hidden) c.hiddenAt ??= at;
      else if (c.hiddenAt !== null) {
        c.hidden += at - c.hiddenAt;
        c.hiddenAt = null;
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return useCallback(() => {
    const c = clock.current;
    if (!c) return 0;
    const now = performance.now();
    return now - c.start - c.hidden - (c.hiddenAt === null ? 0 : now - c.hiddenAt);
  }, []);
}
