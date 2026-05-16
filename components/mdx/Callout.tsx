import type { ReactNode } from "react";
import type { CalloutDirectiveType } from "@/lib/mdx-callouts";

const defaultTitles: Record<CalloutDirectiveType, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  danger: "Danger",
  important: "Important",
  exercise: "Exercise",
};

const skins: Record<CalloutDirectiveType, string> = {
  note: "border-zinc-200 bg-zinc-50 text-zinc-800",
  tip: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  danger: "border-red-300 bg-red-50 text-red-950",
  important: "border-violet-300 bg-violet-50 text-violet-950",
  exercise: "border border-dashed border-sky-300 bg-sky-50 text-sky-950",
};

function normalizeType(type: string): CalloutDirectiveType {
  return type in defaultTitles ? (type as CalloutDirectiveType) : "note";
}

type Props = {
  type: CalloutDirectiveType | string;
  title?: string;
  children: ReactNode;
};

export function Callout({ type, title, children }: Props) {
  const t = normalizeType(type);
  const headline = title?.trim() || defaultTitles[t];

  return (
    <aside
      className={`my-4 rounded-lg border px-4 py-3 ${skins[t]}`}
      data-callout={t}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-90">
        {headline}
      </p>
      <div className="text-sm leading-relaxed [&_p:last-child]:mb-0 [&_p]:mb-2">{children}</div>
    </aside>
  );
}
