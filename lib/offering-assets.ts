import fs from "fs";
import path from "path";
import { offeringDir } from "@/lib/content-roots";
import { assertSafeAssetSegments, assertSafeSlug, isSafeSlug } from "@/lib/slug";


export function offeringAssetsDir(offeringSlug: string): string {
  return path.join(/*turbopackIgnore: true*/ offeringDir(offeringSlug), "assets");
}

/** Rewrite markdown images so ../assets/foo resolves under this offering. */
export function rewriteLessonAssetUrls(source: string, offeringSlug: string): string {
  if (!isSafeSlug(offeringSlug)) return source;
  const base = `](/api/offering-assets/${offeringSlug}/`;
  return source.replace(/\]\(\.\.\/assets\//g, base);
}

export function resolveUnderAssetsRoot(rootDir: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  const resolved = path.normalize(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ rootDir, ...segments));
  const prefix = path.normalize(/*turbopackIgnore: true*/ `${rootDir}${path.sep}`);
  if (!resolved.startsWith(prefix)) return null;
  return resolved;
}

export function safeAssetFilePath(offeringSlug: string, segments: string[]): string | null {
  try {
    assertSafeSlug("offeringSlug", offeringSlug);
    assertSafeAssetSegments(segments);
  } catch {
    return null;
  }
  const root = offeringAssetsDir(offeringSlug);
  const resolved = resolveUnderAssetsRoot(root, segments);
  if (!resolved) return null;
  if (!fs.existsSync(/*turbopackIgnore: true*/ resolved) || !fs.statSync(/*turbopackIgnore: true*/ resolved).isFile()) return null;
  return resolved;
}

const EXT_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export function mimeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
}
