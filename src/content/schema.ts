import { z } from "zod";

// The single source of truth for content shapes. See CONTENT.md for the authoring rules.

const text = z.string().trim().min(1, "must not be empty");

// Answers and outputs must be YAML strings. An unquoted `True` or `45` would be read as
// a boolean or number, and its text would not match what Python prints.
const output = z.string({ error: "must be text: put it in quotes in the YAML" });

const kebab = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case, like dicts-predict-get-default");

export const TopicSchema = z.strictObject({
  id: kebab,
  title: text,
  module: z.int().positive(),
  order: z.int().positive(),
});

const base = {
  id: kebab,
  topic: kebab,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  prompt: text,
  explain: text,
  tags: z.array(text).optional(),
};

const options = z.array(output).min(3, "needs 3 or 4 options").max(4, "needs 3 or 4 options");

export const PredictCardSchema = z.strictObject({
  ...base,
  type: z.literal("predict"),
  code: text,
  answer: output,
  options: options.optional(),
});

export const McqCardSchema = z.strictObject({
  ...base,
  type: z.literal("mcq"),
  code: text.optional(),
  options,
  correct: z.int().nonnegative(),
});

export const BlankSchema = z.strictObject({
  answer: output,
  options,
});

export const FillCardSchema = z.strictObject({
  ...base,
  type: z.literal("fill"),
  code: text,
  blanks: z.array(BlankSchema).min(1).max(3),
  expected_output: output.optional(),
});

export const SpotBugCardSchema = z.strictObject({
  ...base,
  type: z.literal("spot_bug"),
  code: text,
  bug_line: z.int().positive(),
  fixed_code: text,
  expected_output: output.optional(),
});

export const ParsonsCardSchema = z.strictObject({
  ...base,
  type: z.literal("parsons"),
  lines: z.array(output).min(3).max(10),
  distractors: z.array(output).max(2).optional(),
  setup: text.optional(),
  expected_output: output.optional(),
});

const writeFields = {
  starter: text,
  tests: text,
  hint: text,
  solution: text,
};

export const WriteCardSchema = z.strictObject({
  ...base,
  type: z.literal("write"),
  ...writeFields,
});

export const CardSchema = z.discriminatedUnion("type", [
  PredictCardSchema,
  McqCardSchema,
  FillCardSchema,
  SpotBugCardSchema,
  ParsonsCardSchema,
  WriteCardSchema,
]);

// Project steps are write cards that belong to a project, not a topic.
export const ProjectStepSchema = z.strictObject({
  id: kebab,
  level: base.level,
  prompt: text,
  explain: text,
  tags: base.tags,
  ...writeFields,
});

export const ProjectSchema = z.strictObject({
  id: kebab,
  /** Position in the Projects list: the core projects first, then the deck ones. */
  order: z.int().positive(),
  title: text,
  summary: text,
  files: z.record(z.string(), z.string()),
  steps: z.array(ProjectStepSchema).min(1),
});

export type Topic = z.infer<typeof TopicSchema>;
export type PredictCard = z.infer<typeof PredictCardSchema>;
export type McqCard = z.infer<typeof McqCardSchema>;
export type FillCard = z.infer<typeof FillCardSchema>;
export type SpotBugCard = z.infer<typeof SpotBugCardSchema>;
export type ParsonsCard = z.infer<typeof ParsonsCardSchema>;
export type WriteCard = z.infer<typeof WriteCardSchema>;
export type Card = z.infer<typeof CardSchema>;
export type CardType = Card["type"];
export type ProjectStep = z.infer<typeof ProjectStepSchema>;
export type Project = z.infer<typeof ProjectSchema>;

export type Content = { topics: Topic[]; cards: Card[]; projects: Project[] };
