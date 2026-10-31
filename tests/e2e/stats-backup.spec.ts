import { expect, test, type Page } from "@playwright/test";

async function answerAll(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: /Start today's reps/ }).tap();
  // The session screen loads on first use; wait for it before looping.
  await expect(page.getByTestId("session-position")).toBeVisible();
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("button", { name: "Done", exact: true }).count()) break;
    await page.getByRole("button", { name: /^Show (answer|solution)$/ }).tap();
    await page.getByRole("button", { name: "Next" }).tap();
  }
  await page.getByRole("button", { name: "Done", exact: true }).tap();
}

test("stats show today's practice", async ({ page }) => {
  await answerAll(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Stats" }).tap();
  await expect(page.getByTestId("stats-streak")).toHaveText("1 day");
  await expect(page.getByTestId("stats-week")).toHaveText("1 of 5 days");
  // Only first sightings so far, which don't count as reviews.
  await expect(page.getByText("No reviews in the last 7 days yet.")).toBeVisible();
  await expect(page.getByTestId("calendar-readout")).toContainText(/^16 cards on /);
  await expect(page.getByTestId("state-new")).not.toHaveText("0");
  await expect(page.getByTestId("state-learning")).toHaveText("8");
});

test("save a backup, delete everything, and restore it", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { backupText: string };
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { files: File[] }) => {
        w.backupText = (await data.files[0]?.text()) ?? "";
      },
    });
  });
  await answerAll(page);
  await page.goto("./#/settings");
  await page.getByRole("button", { name: "Save a backup file" }).tap();
  await expect(page.getByText(/^Backup saved\./)).toBeVisible();
  const text = await page.evaluate(() => (window as unknown as { backupText: string }).backupText);
  expect(JSON.parse(text)).toMatchObject({ app: "pyreps", schemaVersion: 1 });

  await page.getByRole("button", { name: "Delete all progress" }).tap();
  await page
    .getByRole("dialog", { name: "Delete all progress?" })
    .getByRole("button", { name: "Delete" })
    .tap();
  await expect(page.getByText("Progress deleted. Your settings are kept.")).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).tap();
  await expect(page.getByTestId("streak")).toHaveText("0 days");

  await page.goto("./#/settings");
  await page.getByLabel("Backup file").setInputFiles({
    name: "pyreps-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  const sheet = page.getByRole("dialog", { name: "Restore this backup?" });
  await expect(sheet).toContainText("8 cards with progress");
  await sheet.getByRole("button", { name: "Restore" }).tap();
  await expect(page.getByText("Backup restored.")).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).tap();
  await expect(page.getByTestId("streak")).toHaveText("1 day");
});

test("a file that isn't a backup is refused in plain words", async ({ page }) => {
  await page.goto("./#/settings");
  await page.getByLabel("Backup file").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello": 1}'),
  });
  await expect(page.getByText("This file is not a PyReps backup.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
