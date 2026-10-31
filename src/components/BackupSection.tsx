import { useRef, useState } from "react";
import type { Backup } from "../db/backup.ts";
import { exportAll, importAll, resetProgress } from "../db/db.ts";
import { saveFile } from "../export/exportFiles.ts";
import { dayKey } from "../srs/day.ts";
import Sheet from "./Sheet.tsx";

type Confirm = { kind: "import"; backup: Backup } | { kind: "reset" } | null;

/** Settings: save all progress to a file, bring it back, or start over. */
export default function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<Confirm>(null);

  const exportNow = async () => {
    const text = JSON.stringify(await exportAll(), null, 1);
    const result = await saveFile(`pyreps-backup-${dayKey(new Date())}.json`, text);
    setMessage(
      result === "cancelled"
        ? "Backup cancelled."
        : "Backup saved. Keep the file somewhere safe, like iCloud Drive.",
    );
  };

  const readFile = async (file: File) => {
    // The checker (with Zod) loads only when someone restores a file.
    const { BackupError, parseBackup } = await import("../db/backup.ts");
    try {
      setConfirm({ kind: "import", backup: parseBackup(await file.text()) });
    } catch (err) {
      setMessage(err instanceof BackupError ? err.message : "Could not read this file.");
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    if (confirm.kind === "import") {
      await importAll(confirm.backup);
      setMessage("Backup restored.");
    } else {
      await resetProgress();
      setMessage("Progress deleted. Your settings are kept.");
    }
    setConfirm(null);
  };

  const button =
    "min-h-12 rounded-xl border-2 border-accent px-4 font-bold text-accent disabled:opacity-50";

  return (
    <section aria-labelledby="backup" className="mb-6 rounded-2xl bg-surface p-4">
      <h2 id="backup" className="mb-1 text-[1.25rem] font-bold">
        Backup
      </h2>
      <p className="mb-3 text-[0.9375rem] text-muted">
        Your progress lives only on this phone. Save a backup now and then.
      </p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => void exportNow()} className={button}>
          Save a backup file
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={button}>
          Restore from a backup file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="Backup file"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void readFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => setConfirm({ kind: "reset" })}
          className="min-h-12 rounded-xl px-4 font-bold text-bad"
        >
          Delete all progress
        </button>
      </div>
      <p role="status" className="mt-2 text-[0.9375rem]">
        {message}
      </p>

      <Sheet
        open={confirm !== null}
        title={confirm?.kind === "import" ? "Restore this backup?" : "Delete all progress?"}
        onClose={() => setConfirm(null)}
      >
        <p className="mb-4">
          {confirm?.kind === "import"
            ? `It replaces everything on this phone with the backup from ${confirm.backup.exportedAt.slice(0, 10)}: ` +
              `${confirm.backup.data.reviewStates.length} cards with progress and ${confirm.backup.data.projects.length} projects.`
            : "Reviews, practice, projects and drafts are deleted. Your settings stay. Save a backup first if you may want it back."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirm(null)}
            className="min-h-12 flex-1 rounded-xl border-2 border-border px-4 font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmAction()}
            className="min-h-12 flex-1 rounded-xl bg-bad px-4 font-bold text-bg"
          >
            {confirm?.kind === "import" ? "Restore" : "Delete"}
          </button>
        </div>
      </Sheet>
    </section>
  );
}
