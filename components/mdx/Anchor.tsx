import type { ReactNode } from "react";
import { isSafeManualAnchorId } from "@/lib/mdx-internal-links";
import { warnInvalidManualAnchorId } from "@/lib/mdx-manual-anchor-warn";

type Props = {
  id: string;
  children?: ReactNode;
  className?: string;
};

export function Anchor({ id, children, className = "" }: Props) {
  const valid = typeof id === "string" && isSafeManualAnchorId(id);

  if (!valid) {
    warnInvalidManualAnchorId("Anchor", id);
    const devHint =
      process.env.NODE_ENV === "development"
        ? "ring-1 ring-amber-400/70 ring-offset-2 rounded-sm"
        : "";
    return (
      <span className={[className, devHint].filter(Boolean).join(" ")}>{children}</span>
    );
  }

  return (
    <span id={id} className={className}>
      {children}
    </span>
  );
}
