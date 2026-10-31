import { expect, test, type Page } from "@playwright/test";

const LOAD_TIMEOUT = 60_000;

const checkButton = (page: Page) => page.getByRole("button", { name: "Check", exact: true });
const stepLabel = (page: Page) => page.getByTestId("project-step");

async function openProject(page: Page, id: string) {
  await page.goto(`./#/projects/${id}`);
  await expect(checkButton(page)).toBeEnabled({ timeout: LOAD_TIMEOUT });
}

/** Solve the current step with the built-in solution, then go on. */
async function solveStep(page: Page) {
  await page.getByRole("button", { name: "Show solution" }).tap();
  await page.getByRole("button", { name: "Use this code" }).tap();
  await checkButton(page).tap();
  await expect(page.getByText(/^Step \d done\. All checks passed\.$/)).toBeVisible();
}

test("finish the SBC log parser, step by step", async ({ page }) => {
  await openProject(page, "sbc-log-parser");
  await expect(stepLabel(page)).toHaveText("Step 1 of 3");

  // The starter doesn't pass yet.
  await checkButton(page).tap();
  await expect(page.getByTestId("python-output")).toContainText("checks failed");

  for (const next of ["Step 2 of 3", "Step 3 of 3"]) {
    await solveStep(page);
    await page.getByRole("button", { name: "Next step" }).tap();
    await expect(stepLabel(page)).toHaveText(next);
  }
  await solveStep(page);
  await page.getByRole("button", { name: "Finish project" }).tap();
  await expect(stepLabel(page)).toHaveText("Finished");

  await page.getByRole("button", { name: "Run" }).tap();
  await expect(page.getByTestId("python-output")).toContainText(
    "c1004@ic  sbc-ic-02    503   3087",
  );

  await page.getByRole("link", { name: "All projects" }).tap();
  await expect(page.getByRole("link", { name: /SBC log parser/ })).toContainText("Done");
});

test("the code and the step are kept after a reload", async ({ page }) => {
  await openProject(page, "subnet-planner");
  await solveStep(page);
  await page.getByRole("button", { name: "Next step" }).tap();
  await expect(stepLabel(page)).toHaveText("Step 2 of 3");
  const editor = page.getByLabel("subnet-planner.py");
  await editor.fill('print("my own work")\n');
  await page.waitForTimeout(800);
  await page.reload();
  await expect(stepLabel(page)).toHaveText("Step 2 of 3");
  await expect(page.getByLabel("subnet-planner.py")).toHaveValue('print("my own work")\n');
});

test("project files open as a read-only tab", async ({ page }) => {
  await openProject(page, "log-triage");
  await page.getByRole("tab", { name: "sip-yesterday.log" }).tap();
  await expect(page.getByRole("group", { name: "sip-yesterday.log" })).toContainText("c1004@ic");
  await expect(page.getByText("Your script opens it as project/sip-yesterday.log.")).toBeVisible();
  await page.getByRole("tab", { name: "log-triage.py" }).tap();
  await expect(page.getByLabel("log-triage.py")).toBeVisible();
});

test("start again asks first, in an in-app sheet", async ({ page }) => {
  await openProject(page, "kpi-report");
  await solveStep(page);
  await page.getByRole("button", { name: "Next step" }).tap();
  await expect(stepLabel(page)).toHaveText("Step 2 of 3");

  await page.getByRole("button", { name: "Start this project again" }).tap();
  const sheet = page.getByRole("dialog", { name: "Start again?" });
  await sheet.getByRole("button", { name: "Keep my code" }).tap();
  await expect(stepLabel(page)).toHaveText("Step 2 of 3");

  await page.getByRole("button", { name: "Start this project again" }).tap();
  await sheet.getByRole("button", { name: "Start again" }).tap();
  await expect(stepLabel(page)).toHaveText("Step 1 of 3");
});

test.describe("export", () => {
  test("shares the script with voicelab.py and the data files", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { sharedNames: string[] };
      w.sharedNames = [];
      Object.assign(navigator, {
        canShare: () => true,
        share: (data: { files: File[] }) => {
          w.sharedNames = data.files.map((f) => f.name);
          return Promise.resolve();
        },
      });
    });
    await openProject(page, "sbc-log-parser");
    await page.getByRole("button", { name: "Export file" }).tap();
    await expect(page.getByRole("region", { name: "Export" }).getByRole("status")).toHaveText(
      "Saved. In a-Shell, open the folder and run: python3 sbc-log-parser.py",
    );
    const names = await page.evaluate(
      () => (window as unknown as { sharedNames: string[] }).sharedNames,
    );
    expect(names).toEqual([
      "sbc-log-parser.py",
      "voicelab.py",
      "cdrs.csv",
      "pods.json",
      "prom.json",
      "sip.log",
    ]);
  });

  test("copies the script when files can't be shared", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { copied: string };
      // navigator.clipboard is a read-only getter, so replace it with defineProperty.
      const stub = (name: string, value: unknown) =>
        Object.defineProperty(navigator, name, { value, configurable: true });
      stub("canShare", undefined);
      stub("share", undefined);
      stub("clipboard", {
        writeText: (text: string) => ((w.copied = text), Promise.resolve()),
      });
    });
    await openProject(page, "sbc-log-parser");
    await page.getByRole("button", { name: "Export file" }).tap();
    await expect(page.getByRole("region", { name: "Export" }).getByRole("status")).toContainText(
      "the script was copied",
    );
    const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
    expect(copied).toContain("def parse_line(line):");
  });
});

test("playground: insert a sample, run it, and close the sheet", async ({ page }) => {
  await page.goto("./#/playground");
  await expect(page.getByRole("button", { name: "Run", exact: true })).toBeEnabled({
    timeout: LOAD_TIMEOUT,
  });
  await page.getByLabel("Code").fill("");
  await page.getByRole("button", { name: "Sample data" }).tap();
  const sheet = page.getByRole("dialog", { name: "Sample data" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Insert example for data/sip.log" }).tap();
  await expect(sheet).toBeHidden();
  await expect(page.getByLabel("Code")).toHaveValue(/from voicelab import read_log/);
  await page.getByRole("button", { name: "Run", exact: true }).tap();
  await expect(page.getByTestId("python-output")).toContainText("2026-10-21T09:00:15.254Z");
});
