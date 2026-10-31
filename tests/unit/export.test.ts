import { describe, expect, it, vi } from "vitest";
import { exportBundle, shareFiles } from "../../src/export/exportFiles.ts";

describe("exportBundle", () => {
  it("puts the script first, then voicelab.py and the data files, all flat", () => {
    const files = exportBundle("sbc-log-parser.py", "print(1)\n");
    expect(files.map((f) => f.name)).toEqual([
      "sbc-log-parser.py",
      "voicelab.py",
      "cdrs.csv",
      "pods.json",
      "prom.json",
      "sip.log",
    ]);
    expect(files[0]?.text).toBe("print(1)\n");
    expect(files[1]?.text).toContain("def load_cdrs");
  });
});

describe("shareFiles", () => {
  const files = exportBundle("x.py", "print(1)\n");

  it("shares every file when the browser can", async () => {
    const share = vi.fn(() => Promise.resolve());
    const result = await shareFiles(files, { canShare: () => true, share });
    expect(result).toBe("shared");
    const shared = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files;
    expect(shared.map((f) => f.name)).toEqual(files.map((f) => f.name));
  });

  it("reports a cancel without copying", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const share = () => Promise.reject(new DOMException("no", "AbortError"));
    const result = await shareFiles(files, {
      canShare: () => true,
      share,
      clipboard: { writeText },
    });
    expect(result).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the script when files can't be shared", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const result = await shareFiles(files, { canShare: () => false, clipboard: { writeText } });
    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("print(1)\n");
  });

  it("says so when nothing works", async () => {
    expect(await shareFiles(files, {})).toBe("failed");
  });
});
