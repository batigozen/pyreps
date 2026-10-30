import { expect, test, type Page } from "@playwright/test";

const position = (page: Page) => page.getByTestId("session-position");

async function giveUpAndNext(page: Page) {
  const show = page.getByRole("button", { name: /^Show (answer|solution)$/ });
  await show.tap();
  await page.getByRole("button", { name: "Next" }).tap();
}

test("a full daily session: missed cards come back once, then the summary", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("new-count")).toHaveText("8");
  await expect(page.getByTestId("due-count")).toHaveText("0");
  await expect(page.getByTestId("streak")).toHaveText("0 days");

  await page.getByRole("button", { name: "Start today's reps (8)" }).tap();
  await expect(position(page)).toHaveText("1 / 8");
  // Full screen: no tab bar during a session.
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);

  for (let i = 0; i < 16; i++) await giveUpAndNext(page);

  await expect(page.getByRole("heading", { name: "Today's reps are done" })).toBeVisible();
  await expect(page.getByTestId("summary-total")).toHaveText("0 of 8 right the first time.");
  await page.getByRole("button", { name: "Done" }).tap();

  await expect(page.getByText("Done for today. Well done!")).toBeVisible();
  await expect(page.getByTestId("streak")).toHaveText("1 day");
  await expect(page.getByTestId("new-count")).toHaveText("0");
});

test("closing keeps the session, and Continue resumes it", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Start today's reps/ }).tap();
  await giveUpAndNext(page);
  await expect(position(page)).toHaveText("2 / 9");
  await page.getByRole("button", { name: /^Close/ }).tap();

  await page.reload();
  await page.getByRole("button", { name: "Continue (1 of 9 done)" }).tap();
  await expect(position(page)).toHaveText("2 / 9");
});

test("a right answer is saved as Good, and 'I guessed' makes it Hard", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Start today's reps/ }).tap();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("What does this print?");
  await page.getByLabel("Your answer").fill("None unknown True");
  await page.getByRole("button", { name: "Check" }).tap();

  const note = page.getByTestId("rating-note");
  await expect(note).toHaveText(/^Saved as Good\. Comes back/);
  await page.getByRole("button", { name: "I guessed" }).tap();
  await expect(note).toHaveText(/^Saved as Hard\./);
  await expect(page.getByRole("button", { name: "I knew this" })).toBeVisible();
});

test("settings change today's new cards and the text size", async ({ page }) => {
  await page.goto("./#/settings");
  await page.getByRole("button", { name: "Fewer: New cards" }).tap();
  await expect(page.getByRole("status", { name: "New cards" })).toHaveText("7");
  // dicts and unpack have 6 seed cards each; without dicts only 6 are left.
  // The box changes once the setting is saved, a moment after the tap.
  const dicts = page.getByRole("checkbox", { name: /Dictionaries in depth/ });
  await dicts.tap();
  await expect(dicts).not.toBeChecked();
  await page.getByRole("radio", { name: "Large" }).tap();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.style.getPropertyValue("--text-scale")),
    )
    .toBe("1.15");

  await page.getByRole("link", { name: "Back to Today" }).tap();
  await expect(page.getByTestId("new-count")).toHaveText("6");
  await page.reload();
  await expect(page.getByTestId("new-count")).toHaveText("6");
});

test("practise a topic without changing the schedule of new cards", async ({ page }) => {
  await page.goto("./#/topics");
  await page.getByRole("link", { name: /Dictionaries in depth/ }).tap();
  await expect(page.getByText("0 of 6 mastered")).toBeVisible();
  await page.getByRole("button", { name: "Practise 6" }).tap();
  for (let i = 0; i < 12; i++) await giveUpAndNext(page);
  await expect(page.getByRole("heading", { name: "Practice done" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).tap();

  // The cards were new, not due: they are still new for the daily session.
  await expect(page.getByTestId("new-count")).toHaveText("8");
  await expect(page.getByTestId("streak")).toHaveText("1 day");
});
