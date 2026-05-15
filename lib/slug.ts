/**
 * Slug rules for route segments (courses, modules, lessons).
 * Lowercase letters, digits, hyphens.
 */
const SAFE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MAX_LENGTH = 120;

export function isSafeSlug(slug: string): boolean {
  if (!slug || slug.length > SLUG_MAX_LENGTH) return false;
  return SAFE_SLUG_RE.test(slug);
}

export function assertSafeSlug(label: string, slug: string): void {
  if (!isSafeSlug(slug)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(slug)}`);
  }
}

/**
 * One URL-decoded path segment under course assets.
 * Typical filenames (chart.png); rejects ".", "..", separators, control chars.
 */
export function isSafeAssetSegment(seg: string): boolean {
  if (!seg || seg === "." || seg === "..") return false;
  if (seg.length > 255) return false;
  if (/[\0-\x1f\\/]/.test(seg)) return false;
  if (seg.includes("..")) return false;
  const SAFE_ASSET_RE = /^[a-zA-Z0-9._-]+$/;
  return SAFE_ASSET_RE.test(seg);
}

export function assertSafeAssetSegments(segments: string[]): void {
  for (let i = 0; i < segments.length; i++) {
    if (!isSafeAssetSegment(segments[i]!)) {
      throw new Error(`Invalid asset path segment at index ${i}`);
    }
  }
}
