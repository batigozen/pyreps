import { beforeEach, describe, expect, it } from "vitest";
import { BackupError, migrate, parseBackup } from "../../src/db/backup.ts";
import {
  db,
  exportAll,
  getSettings,
  getStates,
  importAll,
  resetProgress,
  saveProject,
  saveReview,
  setKv,
  updateSettings,
} from "../../src/db/db.ts";
import { Rating, review } from "../../src/srs/scheduler.ts";

const defaults = { newPerDay: 8, maxReviews: 40, unlocked: ["dicts"], fontSize: "medium" as const };

async function someProgress() {
  const at = new Date("2026-10-30T09:00:00");
  await saveReview({
    cardId: "dicts-mcq-keyerror",
    at: at.getTime(),
    rating: Rating.Good,
    result: "first-try",
    ms: 9000,
    mode: "daily",
    isNew: true,
    after: review(undefined, Rating.Good, at).card,
  });
  await saveProject({
    projectId: "sbc-log-parser",
    stepIndex: 1,
    code: "x = 1\n",
    finished: false,
  });
  await updateSettings(defaults, { newPerDay: 5 });
  await setKv("draft:playground", "print(1)");
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("backup", () => {
  it("round-trips every table through JSON, with real Dates", async () => {
    await someProgress();
    const text = JSON.stringify(await exportAll());
    await db.delete();
    await db.open();

    await importAll(parseBackup(text));
    const state = (await getStates()).get("dicts-mcq-keyerror");
    expect(state?.due).toBeInstanceOf(Date);
    expect(state?.reps).toBe(1);
    expect(await db.reviewLog.count()).toBe(1);
    expect((await db.projects.get("sbc-log-parser"))?.stepIndex).toBe(1);
    expect((await getSettings(defaults)).newPerDay).toBe(5);
  });

  it("replaces what is on the phone", async () => {
    const empty = JSON.stringify(await exportAll());
    await someProgress();
    await importAll(parseBackup(empty));
    expect(await db.reviewStates.count()).toBe(0);
  });

  it("refuses files that aren't PyReps backups, in plain words", () => {
    expect(() => parseBackup("not json")).toThrow(/isn't JSON/);
    expect(() => parseBackup('{"app": "other"}')).toThrow(/not a PyReps backup/);
    expect(() => parseBackup('{"app": "pyreps", "schemaVersion": 1, "data": {}}')).toThrow(
      /damaged/,
    );
    expect(() => parseBackup('{"app": "pyreps", "schemaVersion": 99}')).toThrow(/newer version/);
  });

  it("runs migrations step by step up to the current version", () => {
    const migrations = {
      0: (raw: Record<string, unknown>) => ({ ...raw, renamed: raw.old, old: undefined }),
      1: (raw: Record<string, unknown>) => ({ ...raw, extra: true }),
    };
    expect(migrate({ app: "pyreps", old: 7 }, migrations, 2)).toEqual({
      app: "pyreps",
      renamed: 7,
      old: undefined,
      extra: true,
      schemaVersion: 2,
    });
    expect(() => migrate({ schemaVersion: 0 }, {}, 1)).toThrow(BackupError);
  });
});

describe("resetProgress", () => {
  it("deletes progress and drafts but keeps the settings", async () => {
    await someProgress();
    await resetProgress();
    expect(await db.reviewStates.count()).toBe(0);
    expect(await db.reviewLog.count()).toBe(0);
    expect(await db.projects.count()).toBe(0);
    expect(await db.kv.get("draft:playground")).toBeUndefined();
    expect((await getSettings(defaults)).newPerDay).toBe(5);
  });
});
