type Props = { caption: string; head: [string, string]; rows: [string, string][] };

/** The table view behind every chart: the same numbers, without colour or taps. */
export default function ShowNumbers({ caption, head, rows }: Props) {
  return (
    <details className="mt-2 text-[0.9375rem]">
      <summary className="min-h-11 cursor-pointer py-2 font-bold text-accent">
        Show the numbers
      </summary>
      <table className="w-full">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-muted">
            <th className="py-1 font-normal">{head[0]}</th>
            <th className="py-1 text-right font-normal">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(([a, b]) => (
            <tr key={a} className="border-t border-border">
              <td className="py-1">{a}</td>
              <td className="py-1 text-right">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
