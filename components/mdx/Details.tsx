import type { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
};

const DEFAULT_TITLE = "Details";

/** Native collapsible; body supports MDX markdown and math from the lesson pipeline. */
export function Details({ title = DEFAULT_TITLE, children }: Props) {
  const summary = title.trim() || DEFAULT_TITLE;

  return (
    <details className="group my-4 rounded-lg border border-zinc-200 bg-white px-4 py-2 shadow-sm open:shadow-md">
      <summary className="cursor-pointer select-none text-sm font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block text-zinc-400 transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          {summary}
        </span>
      </summary>
      <div className="mt-3 border-t border-zinc-100 pt-3 text-sm leading-relaxed text-zinc-800 [&_p:last-child]:mb-0 [&_p]:mb-2">
        {children}
      </div>
    </details>
  );
}
