import { describe, expect, it } from "vitest";
import { dayKey, endOfDay, shiftDay, startOfDay, streak } from "../../src/srs/day.ts";

const at = (text: string) => new Date(text);

describe("study day (starts at 04:00)", () => {
  it("counts 01:00 as the evening before", () => {
    expect(dayKey(at("2026-10-30T01:00:00"))).toBe("2026-10-29");
    expect(dayKey(at("2026-10-30T03:59:59"))).toBe("2026-10-29");
    expect(dayKey(at("2026-10-30T04:00:00"))).toBe("2026-10-30");
    expect(dayKey(at("2026-10-30T23:59:00"))).toBe("2026-10-30");
  });

  it("starts and ends at 04:00", () => {
    expect(startOfDay(at("2026-10-30T02:00:00"))).toEqual(at("2026-10-29T04:00:00"));
    expect(endOfDay(at("2026-10-30T02:00:00"))).toEqual(at("2026-10-30T04:00:00"));
    expect(endOfDay(at("2026-10-30T10:00:00"))).toEqual(at("2026-10-31T04:00:00"));
  });

  it("moves across months and the October clock change", () => {
    expect(shiftDay("2026-11-01", 1)).toBe("2026-10-31");
    expect(shiftDay("2026-10-26", 1)).toBe("2026-10-25");
    expect(shiftDay("2026-10-25", -1)).toBe("2026-10-26");
  });
});

describe("streak", () => {
  const now = at("2026-10-30T09:00:00");

  it("counts days in a row up to today", () => {
    expect(streak(new Set(["2026-10-28", "2026-10-29", "2026-10-30"]), now)).toBe(3);
  });

  it("keeps yesterday's streak while today is not done yet", () => {
    expect(streak(new Set(["2026-10-28", "2026-10-29"]), now)).toBe(2);
  });

  it("breaks on a missed day", () => {
    expect(streak(new Set(["2026-10-27", "2026-10-28"]), now)).toBe(0);
    expect(streak(new Set(), now)).toBe(0);
  });
});
