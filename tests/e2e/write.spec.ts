import { expect, test, type Page } from "@playwright/test";

const CARD = "dicts-write-asr-per-trunk";
const LOAD_TIMEOUT = 60_000;

const SOLUTION = `from collections import defaultdict
from voicelab import load_cdrs
rows = load_cdrs()

def asr_per_trunk(rows):
    attempts, answered = defaultdict(int), defaultdict(int)
    for r in rows:
        attempts[r["trunk"]] += 1
        answered[r["trunk"]] += r["sip_code"] == "200"
    return {t: answered[t] / n for t, n in attempts.items()}

print(asr_per_trunk(rows))`;

async function openCard(page: Page) {
  await page.goto(`./#/gallery/${CARD}`);
  await expect(page.getByRole("button", { name: "Check" })).toBeEnabled({ timeout: LOAD_TIMEOUT });
}

const editor = (page: Page) => page.getByLabel("Your code");
const bar = (page: Page) => page.getByRole("toolbar", { name: "Symbols" });
const key = (page: Page, name: string) => bar(page).getByRole("button", { name, exact: true });
const output = (page: Page) => page.getByTestId("python-output");
const type = (page: Page, text: string) => page.keyboard.type(text);
const press = (page: Page, name: string) => page.keyboard.press(name);

test("solve the ASR card with the keyboard and the symbol bar", async ({ page }) => {
  await openCard(page);
  await editor(page).tap();
  await expect(bar(page)).toBeVisible();
  await editor(page).fill("");

  // Own undo: a symbol key is one step.
  await type(page, "oops");
  await key(page, "Brackets").tap();
  await expect(editor(page)).toHaveValue("oops()");
  await key(page, "Undo").tap();
  await expect(editor(page)).toHaveValue("oops");
  await editor(page).fill("");

  await type(page, "from collections import defaultdict");
  await press(page, "Enter");
  await type(page, "from voicelab import load_cdrs");
  await press(page, "Enter");
  await type(page, "rows = load_cdrs");
  await key(page, "Brackets").tap();
  await expect(editor(page)).toHaveValue(/rows = load_cdrs\(\)$/);
  await key(page, "Move right").tap();
  await press(page, "Enter");
  await press(page, "Enter");
  await type(page, "def asr_per_trunk");
  await key(page, "Brackets").tap();
  await type(page, "rows");
  await key(page, "Close bracket").tap();
  await key(page, "Colon").tap();
  // Enter after ":" indents by itself.
  await press(page, "Enter");
  await type(page, "attempts, answered = defaultdict(int), defaultdict(int)");
  await press(page, "Enter");
  await type(page, "for r in rows:");
  await press(page, "Enter");
  await type(page, 'attempts[r["trunk"]] += 1');
  await press(page, "Enter");
  await type(page, 'answered[r["trunk"]] += r["sip_code"] == "200"');
  await press(page, "Enter");
  // Backspace in the indent goes back one level.
  await press(page, "Backspace");
  await type(page, "return {t: answered[t] / n for t, n in attempts.items()}");
  await press(page, "Enter");
  await press(page, "Backspace");
  await press(page, "Enter");
  await type(page, "print(asr_per_trunk(rows))");

  await expect(editor(page)).toHaveValue(SOLUTION);

  await page.getByRole("button", { name: "Run", exact: true }).tap();
  await expect(output(page)).toContainText("'ic-rtd-02': 0.4");

  await page.getByRole("button", { name: "Check" }).tap();
  await expect(page.getByRole("status").filter({ hasText: "All checks" })).toHaveText(
    "Right! All checks passed.",
  );
  await expect(page.getByTestId("gallery-outcome")).toContainText("right on the first try");
  await expect(page.getByRole("region", { name: "Why" })).toBeVisible();
});

test("failed checks are listed in plain words, and the draft is kept", async ({ page }) => {
  await openCard(page);
  await page.getByRole("button", { name: "Check" }).tap();
  await expect(output(page)).toContainText("2 checks failed:");
  await expect(output(page)).toContainText("there should be 3 trunks");
  await expect(page.getByText("Failed checks so far: 1")).toBeVisible();

  await editor(page).fill("x = 1 / 0\n");
  await page.getByRole("button", { name: "Check" }).tap();
  await expect(output(page)).toContainText("ZeroDivisionError");
  await expect(page.getByText("Failed checks so far: 2")).toBeVisible();

  // Wait for the save, then reload.
  await page.waitForTimeout(800);
  await page.reload();
  await expect(editor(page)).toHaveValue("x = 1 / 0\n", { timeout: LOAD_TIMEOUT });
});

test("hint and show solution", async ({ page }) => {
  await openCard(page);
  await page.getByRole("button", { name: "Hint" }).tap();
  await expect(page.getByRole("region", { name: "Hint" })).toContainText("defaultdict(int)");
  await page.getByRole("button", { name: "Show solution" }).tap();
  await expect(page.getByRole("region", { name: "Solution" })).toContainText("def asr_per_trunk");
  await expect(page.getByTestId("gallery-outcome")).toContainText("answer shown");
});

test.describe("put in order", () => {
  const add = (page: Page, text: string) =>
    page.getByRole("button", { name: `Add: ${text}`, exact: true }).tap();
  const banner = (page: Page) => page.getByRole("article").getByRole("status");

  test("place lines, fix the indent, and get it right", async ({ page }) => {
    await page.goto("./#/gallery/dicts-parsons-group-by-trunk");
    // A distractor can be placed and sent back.
    await add(page, "per_trunk = {}");
    await page.getByRole("button", { name: /^Line 1, indent 0: per_trunk = \{\}/ }).tap();

    await add(page, "from collections import defaultdict");
    await add(page, "per_trunk = defaultdict(int)");
    await add(page, "for row in rows:");
    await add(page, 'per_trunk[row["trunk"]] += 1');
    await expect(page.getByRole("button", { name: /^Line 4, indent 1:/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
    await add(page, "print(dict(sorted(per_trunk.items())))");

    // The last line follows the indent above, so it is wrong until moved back.
    await page.getByRole("button", { name: "Check" }).tap();
    await expect(banner(page)).toHaveText("Not quite. Try once more.");
    await page.getByRole("button", { name: "Indent less: line 5" }).tap();
    await page.getByRole("button", { name: "Check" }).tap();
    await expect(banner(page)).toHaveText("Right on the second try.");
  });

  test("show answer gives the program", async ({ page }) => {
    await page.goto("./#/gallery/dicts-parsons-group-by-trunk");
    await page.getByRole("button", { name: "Show answer" }).tap();
    await expect(page.getByRole("region", { name: "Answer" })).toContainText(
      "per_trunk = defaultdict(int)",
    );
  });
});
