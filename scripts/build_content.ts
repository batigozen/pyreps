// YAML in content/ -> checked JSON in src/generated/content.json. Exits with 1 on any problem.
// Runs with plain Node (type stripping), no build step needed.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { buildContent, type SourceFile } from "../src/content/checks.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const yamlErrors: string[] = [];

function read(path: string): SourceFile {
  const name = relative(root, path);
  try {
    return { path: name, data: parse(readFileSync(path, "utf8")) as unknown };
  } catch (err) {
    yamlErrors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    return { path: name, data: null };
  }
}

function readDir(dir: string): SourceFile[] {
  const full = join(root, dir);
  let names: string[];
  try {
    names = readdirSync(full);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith(".yaml"))
    .sort()
    .map((name) => read(join(full, name)));
}

const { content, errors } = buildContent(
  read(join(root, "content", "topics.yaml")),
  readDir(join("content", "cards")),
  readDir(join("content", "projects")),
);
const all = [...yamlErrors, ...errors];

if (all.length) {
  console.error(`Content has ${all.length} problem(s):`);
  for (const error of all) console.error(`  - ${error}`);
  process.exit(1);
}

const out = join(root, "src", "generated", "content.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(content)}\n`);
const steps = content.projects.reduce((n, project) => n + project.steps.length, 0);
console.log(
  `content.json: ${content.topics.length} topics, ${content.cards.length} cards, ` +
    `${content.projects.length} project(s) with ${steps} step(s)`,
);
