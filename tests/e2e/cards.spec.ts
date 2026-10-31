import { expect, test, type Page } from "@playwright/test";

const open = (page: Page, id: string) => page.goto(`./#/gallery/${id}`);
const check = (page: Page) => page.getByRole("button", { name: "Check" });
const banner = (page: Page) => page.getByRole("article").getByRole("status");
const outcome = (page: Page) => page.getByTestId("gallery-outcome");
const radio = (page: Page, name: string | RegExp) =>
  page.getByRole("radio", { name, exact: typeof name === "string" });

test.describe("predict, typed", () => {
  test("right on the first try", async ({ page }) => {
    await open(page, "dicts-predict-get-default");
    await expect(check(page)).toBeDisabled();
    await page.getByLabel("Your answer").fill("None unknown True");
    await check(page).tap();
    await expect(banner(page)).toHaveText("Right!");
    await expect(page.getByRole("region", { name: "Why" })).toContainText(".get() returns None");
    await expect(outcome(page)).toContainText("right on the first try");
  });

  test("wrong twice shows the answer", async ({ page }) => {
    await open(page, "dicts-predict-get-default");
    const input = page.getByLabel("Your answer");
    await input.fill("None None True");
    await check(page).tap();
    await expect(banner(page)).toHaveText("Not quite. Try once more.");
    // The same wrong answer can't be checked twice.
    await expect(check(page)).toBeDisabled();
    await input.fill("None unknown False");
    await check(page).tap();
    await expect(banner(page)).toHaveText("Not right. The answer is shown.");
    await expect(page.getByRole("region", { name: "Answer" })).toContainText("None unknown True");
    await expect(outcome(page)).toContainText("wrong twice");
  });

  test("accepts iPhone curly quotes", async ({ page }) => {
    await open(page, "net-predict-struct-pack");
    await page.getByLabel("Your answer").fill("b‘\\x80\\x10\\x00’ 3");
    await page.getByLabel("Your answer").press("Enter");
    await expect(banner(page)).toHaveText("Right!");
  });
});

test("predict with options: a wrong option is ruled out", async ({ page }) => {
  await open(page, "unpack-predict-merge-dicts");
  await radio(page, "0.65 5 0.65").tap();
  await check(page).tap();
  await expect(banner(page)).toHaveText("Not quite. Try once more.");
  await expect(radio(page, "0.65 5 0.65 Wrong")).toBeDisabled();
  await radio(page, "0.6 5 0.65").tap();
  await check(page).tap();
  await expect(banner(page)).toHaveText("Right on the second try.");
  await expect(outcome(page)).toContainText("right on the second try");
});

test("mcq: show answer marks the right option", async ({ page }) => {
  await open(page, "dicts-mcq-keyerror");
  await page.getByRole("button", { name: "Show answer" }).tap();
  await expect(banner(page)).toHaveText("Here is the answer.");
  await expect(radio(page, /It raises KeyError/)).toContainText("Right answer");
  await expect(outcome(page)).toContainText("answer shown");
});

test("fill: wrong blank, then right", async ({ page }) => {
  await open(page, "dicts-fill-count-get");
  await expect(check(page)).toBeDisabled();
  await radio(page, "pop").tap();
  await expect(page.getByRole("group", { name: "Code" })).toContainText("counts.pop(code, 0)");
  await check(page).tap();
  await expect(banner(page)).toHaveText("Not quite. Try once more.");
  await radio(page, "get").tap();
  await check(page).tap();
  await expect(banner(page)).toHaveText("Right on the second try.");
});

test("spot the bug: tap a line, then see the fix", async ({ page }) => {
  await open(page, "dicts-spotbug-sort-by-value");
  const line2 = radio(page, /^Line 2:/);
  const box = await line2.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await line2.tap();
  await check(page).tap();
  await expect(banner(page)).toHaveText("Not quite. Try once more.");
  await radio(page, /^Line 3:/).tap();
  await check(page).tap();
  await expect(banner(page)).toHaveText("Right on the second try.");
  const fix = page.getByRole("region", { name: "The fix" });
  await expect(fix).toContainText("key=lambda item: item[0]");
  await expect(fix).toContainText("key=lambda item: item[1]");
});

test("Next goes to the next card", async ({ page }) => {
  await open(page, "dicts-mcq-keyerror");
  const position = page.getByText(/^Card \d+ of \d+/);
  const before = Number((await position.textContent())?.match(/\d+/)?.[0]);
  await radio(page, /It raises KeyError/).tap();
  await check(page).tap();
  await page.getByRole("button", { name: "Next" }).tap();
  await expect(position).toContainText(`Card ${before + 1} of`);
  await expect(check(page)).toBeDisabled();
});

test("every gallery card fits the phone width and has big tap targets", async ({ page }) => {
  // Hundreds of cards: measure everything in one evaluate per card.
  test.setTimeout(240_000);
  await page.goto("./#/gallery");
  const links = page.getByRole("main").getByRole("listitem").getByRole("link");
  await expect(links.first()).toBeVisible();
  const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  const ids = hrefs.map((href) => href?.split("/").pop() ?? "");
  expect(ids.length).toBeGreaterThanOrEqual(20);

  for (const id of ids) {
    await open(page, id);
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    const layout = await page.evaluate(() => ({
      sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      small: [...document.querySelectorAll("[role=radio], article button")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height < 44 || r.width < 44).length,
    }));
    expect(layout, id).toEqual({ sideways: 0, small: 0 });
  }
});
