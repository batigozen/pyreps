import type { IconName } from "./components/Icon.tsx";

export type Tab = { path: string; label: string; icon: IconName };

export const TABS: readonly Tab[] = [
  { path: "/", label: "Today", icon: "today" },
  { path: "/topics", label: "Topics", icon: "topics" },
  { path: "/projects", label: "Projects", icon: "projects" },
  { path: "/playground", label: "Playground", icon: "playground" },
  { path: "/stats", label: "Stats", icon: "stats" },
];
