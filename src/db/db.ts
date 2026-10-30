import { Dexie, type EntityTable } from "dexie";
import type { Result } from "../cards/outcome.ts";
import { dayKey, startOfDay } from "../srs/day.ts";
import type { FsrsCard, Grade } from "../srs/scheduler.ts";

// Schema v1 from ARCHITECTURE.md. Changing a store's indexes later needs db.version(2)
// and a migration; adding fields to rows does not.

export type ReviewStateRow = FsrsCard & { cardId: string };

export type ReviewLogRow = {
  id?: number;
  cardId: string;
  /** Time of the answer, in ms. */
  at: number;
  day: string;
  rating: Grade;
  result: Result;
  ms: number;
  mode: "daily" | "practice";
  /** True for the first review of a new card. */
  isNew: boolean;
};

export type AttemptRow = {
  id?: number;
  cardId: string;
  at: number;
  day: string;
  result: Result;
  ms: number;
};

type KvRow = { key: string; value: unknown };

type PyRepsDb = Dexie & {
  reviewStates: EntityTable<ReviewStateRow, "cardId">;
  reviewLog: EntityTable<ReviewLogRow, "id">;
  attempts: EntityTable<AttemptRow, "id">;
  projects: EntityTable<{ projectId: string }, "projectId">;
  kv: EntityTable<KvRow, "key">;
};

export const db = new Dexie("pyreps") as PyRepsDb;

db.version(1).stores({
  reviewStates: "cardId, due, state",
  reviewLog: "++id, cardId, at, rating",
  attempts: "++id, cardId, at",
  projects: "projectId",
  kv: "key",
});

// --- key/value -------------------------------------------------------------------------

export async function getKv<T>(key: string): Promise<T | undefined> {
  const row = await db.kv.get(key);
  return row?.value as T | undefined;
}

export async function setKv(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

export async function deleteKv(key: string): Promise<void> {
  await db.kv.delete(key);
}

const draftKey = (id: string) => `draft:${id}`;

/** The user's unfinished code for a write card or the playground. */
export const loadDraft = (id: string) => getKv<string>(draftKey(id));
export const saveDraft = (id: string, code: string) => setKv(draftKey(id), code);
export const clearDraft = (id: string) => deleteKv(draftKey(id));

// --- settings --------------------------------------------------------------------------

export type FontSize = "small" | "medium" | "large";

export type Settings = {
  newPerDay: number;
  maxReviews: number;
  /** Topic ids the user has finished in the course. New cards only come from these. */
  unlocked: string[];
  fontSize: FontSize;
};

export const SETTINGS_KEY = "settings";

export async function getSettings(defaults: Settings): Promise<Settings> {
  return { ...defaults, ...(await getKv<Partial<Settings>>(SETTINGS_KEY)) };
}

export async function updateSettings(defaults: Settings, change: Partial<Settings>) {
  await db.transaction("rw", db.kv, async () => {
    await setKv(SETTINGS_KEY, { ...(await getSettings(defaults)), ...change });
  });
}

// --- reviews ---------------------------------------------------------------------------

export async function getStates(): Promise<Map<string, ReviewStateRow>> {
  const rows = await db.reviewStates.toArray();
  return new Map(rows.map((row) => [row.cardId, row]));
}

export const getState = (cardId: string) => db.reviewStates.get(cardId);

type ReviewInput = Omit<ReviewLogRow, "id" | "day"> & { after: FsrsCard };

/** Saves the card's new FSRS state and the log entry together. Returns the log id. */
export async function saveReview({ after, ...log }: ReviewInput): Promise<number> {
  return db.transaction("rw", db.reviewStates, db.reviewLog, async () => {
    await db.reviewStates.put({ ...after, cardId: log.cardId });
    const id = await db.reviewLog.add({ ...log, day: dayKey(new Date(log.at)) });
    if (id === undefined) throw new Error("review log entry was not saved");
    return id;
  });
}

/** "I knew this" / "I guessed": replaces the rating of a review that was just saved. */
export async function changeReview(logId: number, after: FsrsCard, rating: Grade) {
  await db.transaction("rw", db.reviewStates, db.reviewLog, async () => {
    const log = await db.reviewLog.get(logId);
    if (!log) return;
    await db.reviewStates.put({ ...after, cardId: log.cardId });
    await db.reviewLog.update(logId, { rating });
  });
}

/** A practice answer for a card that wasn't due: kept for stats, no schedule change. */
export async function addAttempt(attempt: Omit<AttemptRow, "id" | "day">) {
  await db.attempts.add({ ...attempt, day: dayKey(new Date(attempt.at)) });
}

/** Reviews and new cards done since the study day started. */
export async function countToday(now: Date) {
  const logs = await db.reviewLog.where("at").aboveOrEqual(startOfDay(now).getTime()).toArray();
  const newCards = logs.filter((log) => log.isNew).length;
  return { reviews: logs.length - newCards, newCards };
}

/** Every study day with at least one answered card. */
export async function practisedDays(): Promise<Set<string>> {
  const [logs, attempts] = await Promise.all([db.reviewLog.toArray(), db.attempts.toArray()]);
  return new Set([...logs, ...attempts].map((row) => row.day));
}

// --- session ---------------------------------------------------------------------------

export type SessionResult = {
  cardId: string;
  topic: string;
  result: Result;
  /** Null in practice mode when the card wasn't due (no schedule change). */
  rating: Grade | null;
};

export type SessionData = {
  mode: "daily" | "practice";
  topic?: string;
  day: string;
  queue: string[];
  /** Position of the next card to answer. */
  index: number;
  /** Cards already put back at the end once. */
  requeued: string[];
  results: SessionResult[];
};

const SESSION_KEY = "session";
const DAILY_DONE_KEY = "dailyDone";

export const loadSession = () => getKv<SessionData>(SESSION_KEY);
export const saveSession = (session: SessionData) => setKv(SESSION_KEY, session);
export const clearSession = () => deleteKv(SESSION_KEY);

/** The study day of the last finished daily session. */
export const getDailyDone = () => getKv<string>(DAILY_DONE_KEY);
export const setDailyDone = (day: string) => setKv(DAILY_DONE_KEY, day);

// --- storage ---------------------------------------------------------------------------

/** Asks the browser not to clear our data when space is low. Safe to call on every start. */
export async function requestPersistence(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    const kept = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    await setKv("persisted", kept);
    return kept;
  } catch {
    return null;
  }
}
