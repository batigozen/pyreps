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
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/pyreps/`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
