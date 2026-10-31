import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import ProgressBar from "../components/ProgressBar.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { content } from "../content/content.ts";
import { listProjects } from "../db/db.ts";

export default function ProjectsScreen() {
  const rows = useLiveQuery(listProjects);
  const byId = new Map((rows ?? []).map((row) => [row.projectId, row]));

  return (
    <>
      <ScreenHeader title="Projects" />
      <p className="mb-4 text-muted">
        Small scripts, built step by step. Export a finished one and run it in a-Shell.
      </p>
      <ul className="flex flex-col gap-2">
        {content.projects.map((project) => {
          const row = byId.get(project.id);
          const total = project.steps.length;
          const done = row ? (row.finished ? total : row.stepIndex) : 0;
          const status = row?.finished
            ? "Done"
            : row
              ? `Step ${row.stepIndex + 1} of ${total}`
              : `${total} steps`;
          return (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="flex min-h-16 flex-col gap-2 rounded-xl border border-border bg-surface p-3"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{project.title}</span>
                  <span className="shrink-0 text-[0.9375rem] text-muted">{status}</span>
                </span>
                <span className="text-[0.9375rem] text-muted">{project.summary}</span>
                <ProgressBar
                  value={done}
                  max={total}
                  label={`${project.title}: ${done} of ${total} steps done`}
                  tone="ok"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
