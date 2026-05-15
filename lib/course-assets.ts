import fs from "fs";
import path from "path";

const CONTENT = path.join(process.cwd(), "content", "courses");

export function courseAssetsDir(courseSlug: string): string {
  return path.join(CONTENT, courseSlug, "assets");
}

/** Rewrite markdown images so ../assets/foo resolves under this course. */
export function rewriteLessonAssetUrls(source: string, courseSlug: string): string {
  const base = `](/api/course-assets/${courseSlug}/`;
  return source.replace(/\]\(\.\.\/assets\//g, base);
}

/** Join segments under assets; returns null if traversal or not a file. */
export function safeAssetFilePath(courseSlug: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  const root = courseAssetsDir(courseSlug);
  const resolved = path.normalize(path.join(root, ...segments));
  const prefix = path.normalize(`${root}${path.sep}`);
  if (!resolved.startsWith(prefix)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
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
