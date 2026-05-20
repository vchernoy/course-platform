import crypto from "crypto";

/** SHA-256 hex digest of UTF-8 MDX source (published file body). */
export function hashPublishedMdxSource(source: string): string {
  return crypto.createHash("sha256").update(source, "utf8").digest("hex");
}
