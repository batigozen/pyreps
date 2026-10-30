// Copies the Pyodide runtime into public/pyodide/ so it is self-hosted and precached.
// Runs on postinstall, so the copy always matches the pinned npm version.
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILES = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pyodide");
const to = join(root, "public", "pyodide");

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const file of FILES) {
  const source = join(from, file);
  if (!existsSync(source)) throw new Error(`Pyodide file not found: ${source}`);
  copyFileSync(source, join(to, file));
}
console.log(`Copied ${FILES.length} Pyodide files to public/pyodide/`);
