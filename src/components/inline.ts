export type InlinePart = { code: boolean; text: string };

/** Splits prose on `backticks`, so code inside sentences can be shown in the code font. */
export function splitInlineCode(text: string): InlinePart[] {
  const parts = text.split("`");
  // An odd number of backticks: the last one is a plain character.
  if (parts.length % 2 === 0) return [{ code: false, text }];
  return parts.flatMap((part, i) => (part ? [{ code: i % 2 === 1, text: part }] : []));
}
