import type { AnchorHTMLAttributes } from "react";
import { resolveLessonMdxHref } from "@/lib/mdx-internal-links";

/** Factory so the lesson page can close over `offeringSlug` for MDX `components.a`. */
export function createMdxAnchor(offeringSlug: string) {
  return function LessonMdxAnchor({
    href,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement>) {
    const resolved =
      typeof href === "string" ? resolveLessonMdxHref(href, offeringSlug) : href;
    return <a href={resolved} {...rest} />;
  };
}
