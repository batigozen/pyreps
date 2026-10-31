import { SEED_FILES } from "../python/seedFiles.ts";

export type ExportFile = { name: string; text: string };

/**
 * The script plus voicelab.py and the sample data, all in one flat folder, so the
 * script runs in a-Shell as it does in the app. voicelab.py finds data files next to
 * itself when there is no data/ folder.
 */
export function exportBundle(scriptName: string, code: string): ExportFile[] {
  const extra = Object.entries(SEED_FILES).map(([path, text]) => ({
    name: path.split("/").pop() ?? path,
    text,
  }));
  return [{ name: scriptName, text: code }, ...extra];
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

type ShareNavigator = {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

/**
 * Opens the share sheet with every file (iOS: "Save to Files"). Where files can't be
 * shared, the script alone is copied to the clipboard.
 */
export async function shareFiles(
  files: readonly ExportFile[],
  nav: ShareNavigator = navigator,
): Promise<ShareResult> {
  // text/plain: iOS may refuse less common types, and the .py name is kept anyway.
  const asFiles = files.map((f) => new File([f.text], f.name, { type: "text/plain" }));
  if (nav.share && nav.canShare?.({ files: asFiles })) {
    try {
      await nav.share({ files: asFiles });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  const script = files[0];
  if (!script || !nav.clipboard) return "failed";
  try {
    await nav.clipboard.writeText(script.text);
    return "copied";
  } catch {
    return "failed";
  }
}
