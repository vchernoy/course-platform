import fs from "node:fs";
import path from "node:path";
import { assertSafeAssetSegments, assertSafeSlug } from "./slug";

const MAX_BYTES = 64 * 1024;

/** Server-only local source; the caller must already authorize the lesson/preview. */
export function readActiveDocument(offeringSlug: string, source: string, contentRoot = path.join(process.cwd(), "content")): string {
  assertSafeSlug("offering", offeringSlug);
  if (typeof source !== "string" || !source.startsWith("../assets/") || !source.endsWith(".md")) {
    throw new Error("ActiveDocument source must be ../assets/<file>.md");
  }
  const segments = source.slice("../assets/".length).split("/");
  assertSafeAssetSegments(segments);
  // Reject symlinks at every level, including the offering/assets directories.
  let current = contentRoot;
  if (fs.lstatSync(current).isSymbolicLink()) throw new Error("ActiveDocument symlinks are not allowed");
  for (const segment of ["offerings", offeringSlug, "assets", ...segments]) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error("ActiveDocument symlinks are not allowed");
  }
  const fd = fs.openSync(current, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error("ActiveDocument must be a file of at most 64 KiB");
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    const size = fs.readSync(fd, buffer, 0, buffer.length, 0);
    if (size > MAX_BYTES) throw new Error("ActiveDocument exceeds 64 KiB");
    return buffer.subarray(0, size).toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}
