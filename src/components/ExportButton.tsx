import { useState } from "react";
import { exportBundle, shareFiles, type ShareResult } from "../export/exportFiles.ts";

type Props = { scriptName: string; code: string };

const MESSAGE: Record<ShareResult, (name: string) => string> = {
  shared: (name) => `Saved. In a-Shell, open the folder and run: python3 ${name}`,
  copied: () =>
    "Sharing files isn't possible here, so the script was copied. Paste it into a new file in a-Shell.",
  cancelled: () => "Export cancelled.",
  failed: () => "Could not export. Try again, or copy the code by hand.",
};

/** Shares the script with voicelab.py and the sample data, for a-Shell. */
export default function ExportButton({ scriptName, code }: Props) {
  const [result, setResult] = useState<ShareResult | null>(null);

  const exportNow = async () => {
    setResult(await shareFiles(exportBundle(scriptName, code)));
  };

  return (
    <section aria-label="Export" className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void exportNow()}
        className="min-h-12 rounded-xl border-2 border-accent px-4 font-bold text-accent"
      >
        Export file
      </button>
      <p role="status" className="text-[0.9375rem]">
        {result && MESSAGE[result](scriptName)}
      </p>
      <details className="text-[0.9375rem] text-muted">
        <summary className="min-h-11 cursor-pointer py-2 font-bold text-fg">
          How to run it in a-Shell
        </summary>
        <ol className="list-decimal pl-5">
          <li>Tap Export file, then Save to Files.</li>
          <li>Pick one folder for all the files, for example On My iPhone › a-Shell.</li>
          <li>
            In a-Shell, go to that folder (type <code>pickFolder</code> to choose it).
          </li>
          <li>
            Run <code>python3 {scriptName}</code>.
          </li>
        </ol>
        <p className="mt-1">
          The script needs voicelab.py and the data files next to it. They are exported with it.
        </p>
      </details>
    </section>
  );
}
