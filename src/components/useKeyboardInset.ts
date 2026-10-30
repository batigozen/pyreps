import { useEffect, useState } from "react";

/**
 * How far the on-screen keyboard covers the bottom of the layout viewport, in px.
 * iOS doesn't resize the page for the keyboard; only the visual viewport shrinks.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(Math.max(0, Math.round(covered)));
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [active]);

  return active ? inset : 0;
}
