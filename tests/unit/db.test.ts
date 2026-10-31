import { beforeEach, describe, expect, it } from "vitest";
import {
  addAttempt,
  changeReview,
  countToday,
  db,
  getSettings,
  getStates,
  loadSession,
  practisedDays,
  saveReview,
  saveSession,
  setTopicUnlocked,
  updateSettings,
} from "../../src/db/db.ts";
import { Rating, review } from "../../src/srs/scheduler.ts";

const defaults = { newPerDay: 8, maxReviews: 40, unlocked: ["dicts"], fontSize: "medium" as const };

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("reviews", () => {
  it("saves the state and the log together, and can change the rating", async () => {
    const at = new Date("2026-10-30T09:00:00");
    const good = review(undefined, Rating.Good, at).card;
    const logId = await saveReview({
      cardId: "dicts-mcq-x",
      at: at.getTime(),
      rating: Rating.Good,
      result: "first-try",
      ms: 9000,
      mode: "daily",
      isNew: true,
      after: good,
    });
    expect((await getStates()).get("dicts-mcq-x")?.reps).toBe(1);

    const hard = review(undefined, Rating.Hard, at).card;
    await changeReview(logId, hard, Rating.Hard);
    expect((await db.reviewLog.get(logId))?.rating).toBe(Rating.Hard);
    expect((await getStates()).get("dicts-mcq-x")?.due).toEqual(hard.due);
  });

  it("counts today's reviews and new cards from 04:00", async () => {
    const add = (cardId: string, when: string, isNew: boolean) =>
      saveReview({
        cardId,
        at: new Date(when).getTime(),
        rating: Rating.Good,
        result: "first-try",
        ms: 1,
        mode: "daily",
        isNew,
        after: review(undefined, Rating.Good, new Date(when)).card,
      });
    await add("a", "2026-10-30T03:00:00", true);
    await add("b", "2026-10-30T05:00:00", true);
    await add("c", "2026-10-30T08:00:00", false);
    expect(await countToday(new Date("2026-10-30T09:00:00"))).toEqual({ reviews: 1, newCards: 1 });
  });

  it("knows which days had practice, from reviews and practice attempts", async () => {
    await addAttempt({
      cardId: "a",
      at: new Date("2026-10-28T10:00:00").getTime(),
      result: "retry",
      ms: 1,
    });
    await saveReview({
      cardId: "b",
      at: new Date("2026-10-30T02:00:00").getTime(),
      rating: Rating.Again,
      result: "wrong",
      ms: 1,
      mode: "daily",
      isNew: true,
      after: review(undefined, Rating.Again, new Date()).card,
    });
    expect(await practisedDays()).toEqual(new Set(["2026-10-28", "2026-10-29"]));
  });
});

describe("settings and session", () => {
  it("keeps defaults for fields never changed", async () => {
    await updateSettings(defaults, { newPerDay: 12 });
    expect(await getSettings(defaults)).toEqual({ ...defaults, newPerDay: 12 });
  });

  it("never loses a topic toggle, even when two run at once", async () => {
    const order = ["setup", "dicts", "unpack"];
    const base = { ...defaults, unlocked: ["setup", "dicts", "unpack"] };
    await Promise.all([
      setTopicUnlocked(base, "setup", false, order),
      setTopicUnlocked(base, "unpack", false, order),
    ]);
    expect((await getSettings(base)).unlocked).toEqual(["dicts"]);
    await setTopicUnlocked(base, "setup", true, order);
    expect((await getSettings(base)).unlocked).toEqual(["setup", "dicts"]);
  });

  it("saves and loads a session", async () => {
    const session = {
      mode: "daily" as const,
      day: "2026-10-30",
      queue: ["a", "b"],
      index: 1,
      requeued: [],
      results: [],
    };
    await saveSession(session);
    expect(await loadSession()).toEqual(session);
  });
});
