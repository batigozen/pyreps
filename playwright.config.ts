import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/pyreps/`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      // WebKit with the iPhone 16 profile. The viewport is the full 393×852
      // screen, like the app opened from the Home Screen (no Safari bars).
      name: "iphone-16",
      use: { ...devices["iPhone 16"], viewport: { width: 393, height: 852 } },
    },
  ],
  webServer: {
    // `npm run e2e` builds first, so a server that is still running also serves the new build.
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/pyreps/`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
