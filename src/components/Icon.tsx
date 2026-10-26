export type IconName =
  "today" | "topics" | "projects" | "playground" | "stats" | "settings" | "back" | "close";

// 24×24 stroke paths. Icons are decorative: the visible text label or the
// parent's aria-label carries the meaning for VoiceOver.
const PATHS: Record<IconName, string[]> = {
  today: [
    "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
    "M4 10h16",
    "M9 2v4",
    "M15 2v4",
    "M9 15l2 2 4-4",
  ],
  topics: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5"],
  projects: ["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  playground: ["M8 8l-4 4 4 4", "M16 8l4 4-4 4", "M14 5l-4 14"],
  stats: ["M5 20v-8", "M12 20V5", "M19 20v-11"],
  settings: [
    "M4 6h9",
    "M17 6h3",
    "M4 12h3",
    "M11 12h9",
    "M4 18h11",
    "M19 18h1",
    "M15 4v4",
    "M9 10v4",
    "M17 16v4",
  ],
  back: ["M15 18l-6-6 6-6"],
  close: ["M6 6l12 12", "M18 6L6 18"],
};

type Props = { name: IconName; className?: string };

export default function Icon({ name, className = "size-6" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
