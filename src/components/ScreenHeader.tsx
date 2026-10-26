import type { ReactNode } from "react";

type Props = { title: string; action?: ReactNode; leading?: ReactNode };

export default function ScreenHeader({ title, action, leading }: Props) {
  return (
    <header className="mb-4 flex min-h-11 items-center gap-2">
      {leading}
      <h1 className="flex-1 text-[28px] leading-tight font-bold">{title}</h1>
      {action}
    </header>
  );
}
