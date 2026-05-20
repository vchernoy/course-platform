import { sanitizeDraftEmailBasename } from "@/lib/drafts/email-filename";
import type { DraftTarget } from "@/lib/drafts/types";
import { isSafeSlug } from "@/lib/slug";

function assertValidPageOrLessonSlug(kind: DraftTarget["kind"], pageOrLessonSlug: string): void {
  if (kind === "sitePage") {
    if (pageOrLessonSlug !== "index" && !isSafeSlug(pageOrLessonSlug)) {
      throw new Error(`Invalid site page slug: ${JSON.stringify(pageOrLessonSlug)}`);
    }
    return;
  }
  if (!isSafeSlug(pageOrLessonSlug)) {
    throw new Error(`Invalid lesson slug: ${JSON.stringify(pageOrLessonSlug)}`);
  }
}

/** Validates offering/site slug and lesson/page slug segments for draft targets. */
export function assertValidDraftTarget(target: DraftTarget): void {
  if (!isSafeSlug(target.parentSlug)) {
    throw new Error(`Invalid draft parent slug: ${JSON.stringify(target.parentSlug)}`);
  }
  assertValidPageOrLessonSlug(target.kind, target.pageOrLessonSlug);
}

/**
 * Blob store pathname (must match list/get/del conventions).
 * drafts/offerings/<offering>/<lesson>/<sanitized-email>.mdx
 * drafts/sites/<site>/<page>/<sanitized-email>.mdx
 */
export function draftBlobPathname(target: DraftTarget, adminEmail: string): string {
  assertValidDraftTarget(target);
  const basename = `${sanitizeDraftEmailBasename(adminEmail)}.mdx`;
  const segment = target.kind === "offeringLesson" ? "offerings" : "sites";
  return `drafts/${segment}/${target.parentSlug}/${target.pageOrLessonSlug}/${basename}`;
}

const PARSE_RE = /^drafts\/(offerings|sites)\/([^/]+)\/([^/]+)\/([^/]+\.mdx)$/;

/**
 * Parses a stored blob pathname into a draft target.
 * Returns null if shape is invalid or segments fail slug validation.
 */
export function tryParseDraftBlobPathname(pathname: string): DraftTarget | null {
  const m = pathname.match(PARSE_RE);
  if (!m) return null;
  const segment = m[1];
  const parentSlug = m[2]!;
  const pageOrLessonSlug = m[3]!;
  try {
    const target: DraftTarget =
      segment === "offerings"
        ? { kind: "offeringLesson", parentSlug, pageOrLessonSlug }
        : { kind: "sitePage", parentSlug, pageOrLessonSlug };
    assertValidDraftTarget(target);
    return target;
  } catch {
    return null;
  }
}
