import { z } from "zod";

// A backup is plain JSON. Dates become ISO strings and are turned back into Dates on
// import. schemaVersion lets later versions of the app read older files.

import { BACKUP_VERSION } from "./backupVersion.ts";

export { BACKUP_VERSION };

export class BackupError extends Error {}

const isoDate = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

const ReviewStateSchema = z.looseObject({
  cardId: z.string(),
  due: isoDate,
  last_review: isoDate.optional(),
  stability: z.number(),
  difficulty: z.number(),
  state: z.number(),
  reps: z.number(),
  lapses: z.number(),
});

const LogSchema = z.looseObject({
  id: z.number().optional(),
  cardId: z.string(),
  at: z.number(),
  day: z.string(),
  result: z.string(),
});

const BackupSchema = z.object({
  app: z.literal("pyreps"),
  schemaVersion: z.int(),
  exportedAt: z.string(),
  data: z.object({
    reviewStates: z.array(ReviewStateSchema),
    reviewLog: z.array(LogSchema.extend({ rating: z.number(), isNew: z.boolean() })),
    attempts: z.array(LogSchema),
    projects: z.array(
      z.looseObject({ projectId: z.string(), stepIndex: z.number(), code: z.string() }),
    ),
    kv: z.array(z.object({ key: z.string(), value: z.unknown() })),
  }),
});

export type Backup = z.output<typeof BackupSchema>;
export type BackupInput = z.input<typeof BackupSchema>;

/** Steps from version n to n + 1. Empty while there is only version 1. */
export type Migrations = Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>;
export const MIGRATIONS: Migrations = {};

/** Brings an old backup up to the current version. Refuses files from a newer app. */
export function migrate(
  raw: Record<string, unknown>,
  migrations: Migrations = MIGRATIONS,
  current = BACKUP_VERSION,
): Record<string, unknown> {
  let version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  if (version > current) {
    throw new BackupError("This backup is from a newer version of PyReps. Update the app first.");
  }
  let data = raw;
  while (version < current) {
    const step = migrations[version];
    if (!step) throw new BackupError(`This backup is too old to read (version ${version}).`);
    data = { ...step(data), schemaVersion: version + 1 };
    version++;
  }
  return data;
}

/** JSON text -> a checked backup with real Dates, or a BackupError in plain words. */
export function parseBackup(text: string, migrations?: Migrations): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError("This file is not a PyReps backup (it isn't JSON).");
  }
  if (typeof raw !== "object" || raw === null || (raw as { app?: unknown }).app !== "pyreps") {
    throw new BackupError("This file is not a PyReps backup.");
  }
  const parsed = BackupSchema.safeParse(migrate(raw as Record<string, unknown>, migrations));
  if (!parsed.success) throw new BackupError("This backup is damaged and can't be read.");
  return parsed.data;
}

export const backupFileName = (day: string) => `pyreps-backup-${day}.json`;
