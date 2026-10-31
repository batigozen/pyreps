import { expect, test, type Page } from "@playwright/test";

const position = (page: Page) => page.getByTestId("session-position");

/** Settings: keep only the given topic on (or none), so tests don't depend on the card bank. */
async function onlyTopic(page: Page, keep: RegExp | null) {
  await page.goto("./#/settings");
  for (const box of await page.getByRole("checkbox").all()) {
    const name =
      (await box.getAttribute("aria-label")) ?? (await box.locator("xpath=..").textContent()) ?? "";
    const wanted = keep !== null && keep.test(name);
    if ((await box.isChecked()) !== wanted) {
      await box.tap();
      await expect(box).toBeChecked({ checked: wanted });
    }
  }
}

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
  // With only dicts on, the first new card is dicts-predict-get-default.
  await onlyTopic(page, /Dictionaries in depth/);
  await page.goto("./");
  await page.getByRole("button", { name: /Start today's reps/ }).tap();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("What does this print?");
  await expect(page.getByRole("group", { name: "Code" })).toContainText('cdr.get("reason")');
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
  await page.getByRole("radio", { name: "Large" }).tap();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.style.getPropertyValue("--text-scale")),
    )
    .toBe("1.15");

  await page.getByRole("link", { name: "Back to Today" }).tap();
  await expect(page.getByTestId("new-count")).toHaveText("7");
  await page.reload();
  await expect(page.getByTestId("new-count")).toHaveText("7");

  // With no finished topics there are no new cards at all.
  await onlyTopic(page, null);
  await page.getByRole("link", { name: "Back to Today" }).tap();
  await expect(page.getByTestId("new-count")).toHaveText("0");
  await expect(page.getByText(/Nothing to do yet/)).toBeVisible();
});

test("practise a topic without changing the schedule of new cards", async ({ page }) => {
  await page.goto("./#/topics");
  await page.getByRole("link", { name: /Dictionaries in depth/ }).tap();
  await expect(page.getByText(/^0 of \d+ mastered$/)).toBeVisible();
  await page.getByRole("button", { name: "Practise 10" }).tap();
  // Each missed card comes back once: 10 cards, 20 answers.
  for (let i = 0; i < 20; i++) await giveUpAndNext(page);
  await expect(page.getByRole("heading", { name: "Practice done" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).tap();

  // The cards were new, not due: they are still new for the daily session.
  await expect(page.getByTestId("new-count")).toHaveText("8");
  await expect(page.getByTestId("streak")).toHaveText("1 day");
});
