import { Dexie, type EntityTable } from "dexie";
import type { Result } from "../cards/outcome.ts";
import { dayKey, startOfDay } from "../srs/day.ts";
import type { FsrsCard, Grade } from "../srs/scheduler.ts";
import type { Backup, BackupInput } from "./backup.ts";
import { BACKUP_VERSION } from "./backupVersion.ts";

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
  /** FSRS state before this answer (0 new, 1 learning, 2 review, 3 relearning). */
  stateBefore?: number;
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

/** Where the user is in a mini project, and their code for the current step. */
export type ProjectRow = {
  projectId: string;
  stepIndex: number;
  code: string;
  finished: boolean;
  updatedAt: number;
};

type PyRepsDb = Dexie & {
  reviewStates: EntityTable<ReviewStateRow, "cardId">;
  reviewLog: EntityTable<ReviewLogRow, "id">;
  attempts: EntityTable<AttemptRow, "id">;
  projects: EntityTable<ProjectRow, "projectId">;
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

// --- projects --------------------------------------------------------------------------

export const getProject = (projectId: string) => db.projects.get(projectId);
export const listProjects = () => db.projects.toArray();

export async function saveProject(row: Omit<ProjectRow, "updatedAt">) {
  await db.projects.put({ ...row, updatedAt: Date.now() });
}

/** Saves new code for the current step, keeping the step and finished flag. */
export async function saveProjectCode(projectId: string, stepIndex: number, code: string) {
  await db.transaction("rw", db.projects, async () => {
    const row = await db.projects.get(projectId);
    await saveProject({ projectId, stepIndex, code, finished: row?.finished ?? false });
  });
}

export const resetProject = (projectId: string) => db.projects.delete(projectId);

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

/**
 * Turns one topic on or off. Reads the saved list inside the transaction, so two fast
 * taps can't overwrite each other. `order` keeps the list in course order.
 */
export async function setTopicUnlocked(
  defaults: Settings,
  topicId: string,
  on: boolean,
  order: readonly string[],
) {
  await db.transaction("rw", db.kv, async () => {
    const current = await getSettings(defaults);
    const next = new Set(current.unlocked);
    if (on) next.add(topicId);
    else next.delete(topicId);
    await setKv(SETTINGS_KEY, { ...current, unlocked: order.filter((id) => next.has(id)) });
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

/** Everything the Stats screen needs: the review log, and the day of every answer. */
export async function statsData() {
  const [logs, attempts] = await Promise.all([db.reviewLog.toArray(), db.attempts.toArray()]);
  return { logs, answeredDays: [...logs, ...attempts].map((row) => row.day) };
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

// --- backup and reset ------------------------------------------------------------------

/** Every table, ready for JSON.stringify. */
export async function exportAll(now = new Date()): Promise<BackupInput> {
  return db.transaction(
    "r",
    [db.reviewStates, db.reviewLog, db.attempts, db.projects, db.kv],
    async () => ({
      app: "pyreps" as const,
      schemaVersion: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      data: {
        reviewStates: (await db.reviewStates.toArray()).map((row) => ({
          ...row,
          due: row.due.toISOString(),
          last_review: row.last_review?.toISOString(),
        })),
        reviewLog: await db.reviewLog.toArray(),
        attempts: await db.attempts.toArray(),
        projects: await db.projects.toArray(),
        kv: await db.kv.toArray(),
      },
    }),
  );
}

/** Replaces everything on this phone with the backup, in one transaction. */
export async function importAll(backup: Backup): Promise<void> {
  const tables = [db.reviewStates, db.reviewLog, db.attempts, db.projects, db.kv];
  await db.transaction("rw", tables, async () => {
    await Promise.all(tables.map((table) => table.clear()));
    const { data } = backup;
    await db.reviewStates.bulkPut(data.reviewStates as unknown as ReviewStateRow[]);
    await db.reviewLog.bulkPut(data.reviewLog as unknown as ReviewLogRow[]);
    await db.attempts.bulkPut(data.attempts as unknown as AttemptRow[]);
    await db.projects.bulkPut(data.projects as unknown as ProjectRow[]);
    await db.kv.bulkPut(data.kv);
  });
}

/** Keys kept by a reset: the user's settings, not their progress. */
const KEEP_ON_RESET = new Set([SETTINGS_KEY, "persisted"]);

/** Deletes all progress (reviews, practice, projects, drafts, session). Keeps settings. */
export async function resetProgress(): Promise<void> {
  await db.transaction(
    "rw",
    [db.reviewStates, db.reviewLog, db.attempts, db.projects, db.kv],
    async () => {
      await Promise.all([
        db.reviewStates.clear(),
        db.reviewLog.clear(),
        db.attempts.clear(),
        db.projects.clear(),
      ]);
      const keys = (await db.kv.toCollection().primaryKeys()).filter(
        (key) => !KEEP_ON_RESET.has(key),
      );
      await db.kv.bulkDelete(keys);
    },
  );
}
