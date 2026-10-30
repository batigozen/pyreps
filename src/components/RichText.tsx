import { splitInlineCode } from "./inline.ts";

type Props = { text: string };

export default function RichText({ text }: Props) {
  return splitInlineCode(text).map((part, i) =>
    part.code ? (
      <code key={i} className="rounded border border-border bg-surface px-1 text-[0.9em]">
        {part.text}
      </code>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}
