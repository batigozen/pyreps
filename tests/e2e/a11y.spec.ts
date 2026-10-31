import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SCREENS = [
  "./",
  "./#/topics",
  "./#/topics/dicts",
  "./#/projects",
  "./#/projects/log-triage",
  "./#/playground",
  "./#/stats",
  "./#/settings",
  "./#/gallery/dicts-spotbug-sort-by-value",
  "./#/gallery/dicts-parsons-group-by-trunk",
  "./#/gallery/dicts-write-asr-per-trunk",
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const path of SCREENS) {
      test(`no accessibility problems on ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading").first()).toBeVisible();
        await page.waitForTimeout(300);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const problems = results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
        );
        expect(problems).toEqual([]);
      });
    }
  });
}

test("every button and link is at least 44 pt, on every screen", async ({ page }) => {
  const small: string[] = [];
  for (const path of SCREENS) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.waitForTimeout(300);
    const found = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href], summary, [role=tab]")]
        .filter((el) => el.closest("p") === null) // links inside a sentence are exempt (WCAG 2.5.8)
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({
          r: el.getBoundingClientRect(),
          name: el.textContent?.trim() || el.getAttribute("aria-label"),
        }))
        .filter(({ r }) => r.height < 44 || r.width < 24)
        .map(({ r, name }) => `${name} (${Math.round(r.width)}x${Math.round(r.height)})`),
    );
    small.push(...found.map((f) => `${path}: ${f}`));
  }
  expect(small).toEqual([]);
});
