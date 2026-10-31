import { z } from "zod";
import {
  CardSchema,
  ProjectSchema,
  TopicSchema,
  type Card,
  type Content,
  type Project,
  type Topic,
} from "./schema.ts";

/** One YAML file, already parsed. `data` is whatever the YAML held. */
export type SourceFile = { path: string; data: unknown };

export type BuildResult = { content: Content; errors: string[] };

export const BLANK = "____";

export const countBlanks = (code: string) => code.split(BLANK).length - 1;

export const codeLines = (code: string) => code.replace(/\n+$/, "").split("\n");

/** Code lines the user sees must fit a phone without much sideways scrolling. */
export const MAX_LINE = 60;

function longLines(fields: Record<string, string | readonly string[] | undefined>): string[] {
  return Object.entries(fields).flatMap(([name, value]) => {
    const lines = typeof value === "string" ? value.split("\n") : (value ?? []);
    return lines.flatMap((line, i) =>
      line.length > MAX_LINE
        ? [`${name} line ${i + 1} has ${line.length} characters (at most ${MAX_LINE})`]
        : [],
    );
  });
}

// `spot_bug` becomes `spotbug` in ids: dicts-spotbug-sort-by-value.
const idPrefix = (card: Card) => `${card.topic}-${card.type.replace("_", "")}-`;

function cardProblems(card: Card): string[] {
  const problems: string[] = [];
  if (!card.id.startsWith(idPrefix(card))) {
    problems.push(`id must start with "${idPrefix(card)}"`);
  }
  switch (card.type) {
    case "predict":
      problems.push(...longLines({ code: card.code }));
      if (card.options && !card.options.includes(card.answer)) {
        problems.push("answer is not one of the options");
      }
      if (card.options && new Set(card.options).size !== card.options.length) {
        problems.push("options repeat");
      }
      break;
    case "mcq":
      problems.push(...longLines({ code: card.code }));
      if (card.correct >= card.options.length) problems.push("correct is past the last option");
      if (new Set(card.options).size !== card.options.length) problems.push("options repeat");
      break;
    case "fill": {
      problems.push(...longLines({ code: card.code }));
      const found = countBlanks(card.code);
      if (found !== card.blanks.length) {
        problems.push(`code has ${found} ${BLANK} but there are ${card.blanks.length} blanks`);
      }
      card.blanks.forEach((blank, i) => {
        if (!blank.options.includes(blank.answer)) {
          problems.push(`blank ${i + 1}: answer is not one of its options`);
        }
        if (new Set(blank.options).size !== blank.options.length) {
          problems.push(`blank ${i + 1}: options repeat`);
        }
      });
      break;
    }
    case "spot_bug": {
      problems.push(...longLines({ code: card.code, fixed_code: card.fixed_code }));
      const buggy = codeLines(card.code);
      const fixed = codeLines(card.fixed_code);
      if (card.bug_line > buggy.length) {
        problems.push(`bug_line ${card.bug_line} is past the last line (${buggy.length})`);
      } else if (buggy.length !== fixed.length) {
        problems.push("fixed_code must have the same number of lines as code");
      } else {
        const changed = buggy.flatMap((line, i) => (line === fixed[i] ? [] : [i + 1]));
        if (changed.length !== 1 || changed[0] !== card.bug_line) {
          problems.push(
            `the fix must change only line ${card.bug_line}, but it changes ${
              changed.length ? `line ${changed.join(", ")}` : "nothing"
            }`,
          );
        }
      }
      break;
    }
    case "parsons":
      problems.push(...longLines({ lines: card.lines, distractors: card.distractors }));
      card.lines.forEach((line, i) => {
        const spaces = line.length - line.trimStart().length;
        if (spaces % 4 !== 0 || spaces > 16) {
          problems.push(`line ${i + 1}: indent must be 0 to 16 spaces, in steps of 4`);
        }
      });
      for (const distractor of card.distractors ?? []) {
        if (card.lines.includes(distractor)) {
          problems.push(`distractor is also a correct line: ${distractor}`);
        }
      }
      break;
    case "write":
      problems.push(...longLines({ starter: card.starter, solution: card.solution }));
      break;
  }
  return problems;
}

function issues(path: string, label: string, error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path.length ? ` > ${issue.path.join(".")}` : "";
    return `${path} :: ${label}${where}: ${issue.message}`;
  });
}

function labelOf(item: unknown, index: number): string {
  if (item && typeof item === "object" && "id" in item && typeof item.id === "string") {
    return item.id;
  }
  return `item ${index + 1}`;
}

/** Checks every topic, card and project, and collects all problems at once. */
export function buildContent(
  topicsFile: SourceFile,
  cardFiles: SourceFile[],
  projectFiles: SourceFile[],
): BuildResult {
  const errors: string[] = [];
  const topics: Topic[] = [];
  const cards: Card[] = [];
  const projects: Project[] = [];

  const asList = (file: SourceFile): unknown[] => {
    if (Array.isArray(file.data)) return file.data;
    if (file.data != null) errors.push(`${file.path}: must be a YAML list`);
    return [];
  };

  asList(topicsFile).forEach((item, i) => {
    const parsed = TopicSchema.safeParse(item);
    if (parsed.success) topics.push(parsed.data);
    else errors.push(...issues(topicsFile.path, labelOf(item, i), parsed.error));
  });
  const topicIds = new Set(topics.map((topic) => topic.id));

  const seen = new Map<string, string>();
  const claim = (id: string, path: string) => {
    const first = seen.get(id);
    if (first) errors.push(`${path} :: ${id}: id is already used in ${first}`);
    else seen.set(id, path);
  };

  for (const file of cardFiles) {
    asList(file).forEach((item, i) => {
      const parsed = CardSchema.safeParse(item);
      if (!parsed.success) {
        errors.push(...issues(file.path, labelOf(item, i), parsed.error));
        return;
      }
      const card = parsed.data;
      claim(card.id, file.path);
      const problems = cardProblems(card);
      if (!topicIds.has(card.topic)) problems.push(`unknown topic "${card.topic}"`);
      if (problems.length) errors.push(...problems.map((p) => `${file.path} :: ${card.id}: ${p}`));
      else cards.push(card);
    });
  }

  for (const file of projectFiles) {
    const parsed = ProjectSchema.safeParse(file.data);
    if (!parsed.success) {
      errors.push(...issues(file.path, labelOf(file.data, 0), parsed.error));
      continue;
    }
    claim(parsed.data.id, file.path);
    for (const step of parsed.data.steps) {
      claim(step.id, file.path);
      const long = longLines({ starter: step.starter, solution: step.solution });
      errors.push(...long.map((p) => `${file.path} :: ${step.id}: ${p}`));
    }
    projects.push(parsed.data);
  }

  projects.sort((a, b) => a.order - b.order);
  return { content: { topics, cards, projects }, errors };
}
