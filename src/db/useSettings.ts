import { useLiveQuery } from "dexie-react-hooks";
import { content } from "../content/content.ts";
import { getSettings, type FontSize, type Settings } from "./db.ts";

/** Core modules 1–6 start unlocked; the rest and the domain decks wait for the user. */
export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 8,
  maxReviews: 40,
  unlocked: content.topics.filter((topic) => topic.module <= 6).map((topic) => topic.id),
  fontSize: "medium",
};

export const TEXT_SCALE: Record<FontSize, number> = { small: 0.9, medium: 1, large: 1.15 };

/** The saved settings, live. Undefined only while the first read is running. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(() => getSettings(DEFAULT_SETTINGS));
}
