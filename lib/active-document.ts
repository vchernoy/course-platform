import fs from "node:fs";
import path from "node:path";
import { assertSafeAssetSegments, assertSafeSlug } from "./slug";
import { containedFileRealPath, offeringDir } from "./content-roots";

const MAX_BYTES = 64 * 1024;

/** Server-only local source; the caller must already authorize the lesson/preview. */
export function readActiveDocument(offeringSlug: string, source: string): string {
  assertSafeSlug("offering", offeringSlug);
  if (typeof source !== "string" || !source.startsWith("../assets/") || !source.endsWith(".md")) {
    throw new Error("ActiveDocument source must be ../assets/<file>.md");
  }
  const segments = source.slice("../assets/".length).split("/");
  assertSafeAssetSegments(segments);
  const dir = offeringDir(offeringSlug);
  if (!dir) throw new Error("ActiveDocument offering is not registered");
  const assets = path.join(dir, "assets");
  // Keep the no-symlink contract, including the offering/assets directory itself.
  if (fs.realpathSync(assets) !== path.resolve(assets)) throw new Error("ActiveDocument symlinks are not allowed");
  let current = assets;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error("ActiveDocument symlinks are not allowed");
  }
  const file = containedFileRealPath(current, assets);
  if (!file) throw new Error("ActiveDocument source is outside its offering assets");
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
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
