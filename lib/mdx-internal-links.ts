import { SLUG_MAX_LENGTH, isSafeSlug } from "@/lib/slug";

/** Fragment after `#`: lowercase letters, digits, hyphens (matches heading id style from rehype-slug). */
const SAFE_HEADING_FRAGMENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSafeHeadingFragment(fragment: string): boolean {
  if (!fragment || fragment.length > SLUG_MAX_LENGTH) return false;
  return SAFE_HEADING_FRAGMENT_RE.test(fragment);
}

/**
 * Rewrites lesson:/offering: pseudo-URLs used in lesson Markdown links.
 * Optional `#fragment` is appended only when `isSafeHeadingFragment` passes.
 * Other hrefs are returned unchanged.
 */
export function resolveLessonMdxHref(
  href: string | undefined,
  currentOfferingSlug: string
): string | undefined {
  if (href === undefined || href === "") return href;

  const hashIdx = href.indexOf("#");
  const base = hashIdx === -1 ? href : href.slice(0, hashIdx);
  const rawFrag = hashIdx === -1 ? undefined : href.slice(hashIdx + 1);

  let suffix = "";
  if (rawFrag !== undefined) {
    if (!isSafeHeadingFragment(rawFrag)) {
      return href;
    }
    suffix = `#${rawFrag}`;
  }

  if (base.startsWith("lesson:")) {
    const lessonSlug = base.slice("lesson:".length);
    if (!isSafeSlug(lessonSlug)) return href;
    return `/offerings/${currentOfferingSlug}/${lessonSlug}${suffix}`;
  }

  if (base.startsWith("offering:")) {
    const rest = base.slice("offering:".length);
    const segments = rest.split("/").filter(Boolean);
    if (segments.length === 1) {
      const slug = segments[0]!;
      if (!isSafeSlug(slug)) return href;
      return `/offerings/${slug}${suffix}`;
    }
    if (segments.length === 2) {
      const [offSlug, lesSlug] = segments;
      if (!isSafeSlug(offSlug!) || !isSafeSlug(lesSlug!)) return href;
      return `/offerings/${offSlug}/${lesSlug}${suffix}`;
    }
    return href;
  }

  return href;
}
