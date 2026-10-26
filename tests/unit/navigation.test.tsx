import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../../src/App.tsx";
import { TABS } from "../../src/navigation.ts";

// No service worker in jsdom: the update toast stays hidden.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    offlineReady: [false, () => {}],
    needRefresh: [false, () => {}],
    updateServiceWorker: () => Promise.resolve(),
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;
const nav = () => screen.getByRole("navigation", { name: "Main" });

afterEach(cleanup);

describe("bottom navigation", () => {
  it("shows the five tabs in order", () => {
    renderAt("/");
    const labels = within(nav())
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(labels).toEqual(["Today", "Topics", "Projects", "Playground", "Stats"]);
  });

  it("opens each screen and marks only its tab as current", () => {
    renderAt("/");
    for (const tab of TABS) {
      fireEvent.click(within(nav()).getByRole("link", { name: tab.label }));
      expect(heading()).toBe(tab.label);
      const current = within(nav())
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page");
      expect(current.map((link) => link.textContent)).toEqual([tab.label]);
    }
  });

  it("sends unknown paths to Today", () => {
    renderAt("/no-such-screen");
    expect(heading()).toBe("Today");
  });
});

describe("settings", () => {
  it("opens from Today and goes back", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(heading()).toBe("Settings");
    fireEvent.click(screen.getByRole("link", { name: "Back to Today" }));
    expect(heading()).toBe("Today");
  });
});
