import { useEffect } from "react";
import { TEXT_SCALE, useSettings } from "../db/useSettings.ts";

/** Applies Settings > Text size to the whole app. Renders nothing. */
export default function TextScale() {
  const fontSize = useSettings()?.fontSize ?? "medium";
  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", String(TEXT_SCALE[fontSize]));
  }, [fontSize]);
  return null;
}
