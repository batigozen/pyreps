import { expect, test, type Page } from "@playwright/test";

const LOAD_TIMEOUT = 60_000;

async function openPlayground(page: Page) {
  await page.goto("./#/playground");
  await expect(page.getByTestId("python-status")).toHaveText("Python ready", {
    timeout: LOAD_TIMEOUT,
  });
}

async function run(page: Page, code: string) {
  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Run", exact: true }).tap();
}

const output = (page: Page) => page.getByTestId("python-output");

test("runs Python and shows the output", async ({ page }) => {
  await openPlayground(page);
  await run(page, "print(sum(range(10)))");
  await expect(output(page)).toHaveText("45");
});

test("has the sample data and voicelab", async ({ page }) => {
  await openPlayground(page);
  await run(page, "from voicelab import load_cdrs; print(len(load_cdrs()))");
  await expect(output(page)).toHaveText("48");
});

test("stops an endless loop after 5 s, stays responsive, and recovers", async ({ page }) => {
  await openPlayground(page);
  await run(page, 'print("before")\nwhile True:\n    pass');
  await expect(page.getByRole("button", { name: "Running…" })).toBeVisible();
  await expect(output(page)).toContainText("before");

  // The UI still works while Python is stuck.
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Stats" }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
  await nav.getByRole("link", { name: "Playground" }).tap();

  await expect(page.getByTestId("python-status")).toHaveText("Python ready", {
    timeout: LOAD_TIMEOUT,
  });
  await run(page, "print(6 * 7)");
  // This run waits for the stuck one to time out and for the restart.
  await expect(output(page)).toHaveText("42", { timeout: LOAD_TIMEOUT });
});

test("shows the timeout message", async ({ page }) => {
  await openPlayground(page);
  const started = Date.now();
  await run(page, "while True:\n    pass");
  await expect(output(page)).toHaveText("Stopped: took longer than 5 s (endless loop?)", {
    timeout: 10_000,
  });
  expect(Date.now() - started).toBeGreaterThanOrEqual(4_900);
});

test("an endless print loop doesn't freeze the page", async ({ page }) => {
  await openPlayground(page);
  await run(page, 'while True:\n    print("sip 503 " * 10)');
  await expect(output(page)).toContainText("Stopped: took longer than 5 s", { timeout: 15_000 });
  await expect(output(page)).toContainText("Output cut");
  const text = (await output(page).textContent()) ?? "";
  expect(text.length).toBeLessThan(250_000);
});

test("shows a trimmed traceback with the right line", async ({ page }) => {
  await openPlayground(page);
  await run(page, "x = 1\ny = x / 0");
  await expect(output(page)).toContainText('File "main.py", line 2');
  await expect(output(page)).toContainText("ZeroDivisionError");
  await expect(output(page)).not.toContainText("harness");
});

test("sys.exit(0) counts as success", async ({ page }) => {
  await openPlayground(page);
  await run(page, 'import sys\nprint("done")\nsys.exit(0)');
  await expect(output(page)).toHaveText("done");
});

test("user code can't reach storage or the network", async ({ page }) => {
  await openPlayground(page);
  await run(
    page,
    `import js
names = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource",
         "indexedDB", "caches", "importScripts", "Worker",
         "navigator", "document", "window"]
print("left:", [n for n in names if hasattr(js, n)])`,
  );
  await expect(output(page)).toHaveText("left: []");
});

test("user code can't make code from text to reach the network", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await openPlayground(page);
  await run(
    page,
    `import js
url = "import('https://example.com/x.js')"
print("eval", hasattr(js, "eval"))
attempts = [
    lambda: js.Function(url)(),
    lambda: js.Object.constructor(url)(),
    lambda: js.setTimeout(url, 0),
    lambda: js.setInterval(url, 0),
]
for attempt in attempts:
    try:
        attempt()
        print("ran")
    except Exception as err:
        print("blocked")`,
  );
  await expect(output(page)).toHaveText(/eval False\s+blocked\s+blocked\s+blocked\s+blocked/);
  await page.waitForTimeout(500);
  expect(requests.filter((url) => url.includes("example.com"))).toEqual([]);
});

test("asyncio still works after the lock", async ({ page }) => {
  await openPlayground(page);
  await run(
    page,
    `import asyncio
async def main():
    await asyncio.sleep(0)
    return 1
task = asyncio.ensure_future(main())
print(type(task).__name__)`,
  );
  await expect(output(page)).toContainText("Task");
});

test("page makes no third-party requests and has no CSP errors", async ({ page }) => {
  const hosts = new Set<string>();
  const problems: string[] = [];
  page.on("request", (request) => hosts.add(new URL(request.url()).host));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(String(error)));

  await openPlayground(page);
  await run(page, "print(1)");
  await expect(output(page)).toHaveText("1");

  expect([...hosts]).toEqual(["localhost:4173"]);
  expect(problems).toEqual([]);
});

test("Python works offline after the first visit", async ({ page, context }) => {
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("works offline", {
    timeout: LOAD_TIMEOUT,
  });
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  const offline = await context.newPage();
  await openPlayground(offline);
  await run(offline, "from voicelab import load_cdrs; print(len(load_cdrs()))");
  await expect(output(offline)).toHaveText("48");

  // A restart must work offline too.
  await run(offline, "while True:\n    pass");
  await expect(output(offline)).toContainText("Stopped", { timeout: 10_000 });
  await expect(offline.getByTestId("python-status")).toHaveText("Python ready", {
    timeout: LOAD_TIMEOUT,
  });
  await run(offline, "print(sum(range(10)))");
  await expect(output(offline)).toHaveText("45");
});
