import { expect, test, type Page } from "@playwright/test";

const TABS = ["Today", "Topics", "Projects", "Playground", "Stats"];

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

test("switches between the five tabs", async ({ page }) => {
  await page.goto("./");
  await expect(heading(page, "Today")).toBeVisible();

  for (const label of [...TABS.slice(1), "Today"]) {
    const link = nav(page).getByRole("link", { name: label });
    await link.tap();
    await expect(heading(page, label)).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
  }
});

test("tabs are big enough to tap and the page never scrolls sideways", async ({ page }) => {
  await page.goto("./");
  for (const label of TABS) {
    const link = nav(page).getByRole("link", { name: label });
    await link.tap();
    await expect(heading(page, label)).toBeVisible();

    const box = await link.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sideways).toBe(0);
  }
});

test("Settings opens from Today", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Settings" }).tap();
  await expect(heading(page, "Settings")).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).tap();
  await expect(heading(page, "Today")).toBeVisible();
});

test("opens offline after the first visit", async ({ page, context }) => {
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("works offline", { timeout: 60_000 });

  // The first visit installs the service worker; it controls the next load.
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  // A fresh page load, like opening the app from the Home Screen in airplane mode.
  await context.setOffline(true);
  const offline = await context.newPage();
  await offline.goto("./");
  await expect(heading(offline, "Today")).toBeVisible();
  await nav(offline).getByRole("link", { name: "Stats" }).tap();
  await expect(heading(offline, "Stats")).toBeVisible();
});
