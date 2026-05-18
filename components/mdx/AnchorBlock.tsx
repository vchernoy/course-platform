import type { ReactNode } from "react";
import { isSafeManualAnchorId } from "@/lib/mdx-internal-links";
import { warnInvalidManualAnchorId } from "@/lib/mdx-manual-anchor-warn";

type Props = {
  id: string;
  children?: ReactNode;
  className?: string;
};

export function AnchorBlock({ id, children, className = "" }: Props) {
  const valid = typeof id === "string" && isSafeManualAnchorId(id);

  if (!valid) {
    warnInvalidManualAnchorId("AnchorBlock", id);
    const devHint =
      process.env.NODE_ENV === "development"
        ? "ring-1 ring-amber-400/70 ring-offset-2 rounded-md"
        : "";
    return (
      <div className={[className, devHint].filter(Boolean).join(" ")}>{children}</div>
    );
  }

  return (
    <div
      id={id}
      className={[
        "group relative my-3 scroll-mt-20 rounded-md border border-transparent px-1 py-2 -mx-1 hover:border-zinc-200/90",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex gap-3 items-start">
        <div className="min-w-0 flex-1">{children}</div>
        <a
          href={`#${id}`}
          className="mt-0.5 shrink-0 text-sm font-normal text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 no-underline hover:text-zinc-600"
          aria-label="Link to this block"
        >
          #
        </a>
      </div>
    </div>
  );
}
