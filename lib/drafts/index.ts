import path from "path";
import { BlobDraftRepository } from "@/lib/drafts/blob-draft-repository";
import { resolveDraftBackend } from "@/lib/drafts/deployment-policy";
import { LocalFileDraftRepository } from "@/lib/drafts/local-file-draft-repository";
import type { DraftRepository } from "@/lib/drafts/types";

export type {
  DraftRecord,
  DraftRepository,
  DraftStored,
  DraftTarget,
} from "@/lib/drafts/types";

export { BlobDraftRepository } from "@/lib/drafts/blob-draft-repository";
export { LocalFileDraftRepository } from "@/lib/drafts/local-file-draft-repository";
export { sanitizeDraftEmailBasename } from "@/lib/drafts/email-filename";
export {
  parseDraftMdxFile,
  serializeDraftMdxFile,
  type DraftFrontmatterFields,
  type DraftFrontmatterParsed,
} from "@/lib/drafts/draft-frontmatter";
export { getDraftStatus, type DraftStatus } from "@/lib/drafts/draft-status";
export { hashPublishedMdxSource } from "@/lib/drafts/source-hash";
export {
  assertWritablePublishedMdxPath,
  tryPublishLocalDraft,
} from "@/lib/drafts/publish-local";
export { CONFLICT_MSG } from "@/lib/drafts/publish-messages";

let singleton: DraftRepository | null = null;

export function defaultDraftRoot(): string {
  return path.join(process.cwd(), ".data", "drafts");
}

/**
 * Singleton draft backend: filesystem under `.data/drafts` or Vercel Blob (`DRAFT_BACKEND=blob`).
 */
export function createDraftRepository(): DraftRepository {
  if (!singleton) {
    const backend = resolveDraftBackend();
    if (backend === "blob") {
      if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
        throw new Error(
          "DRAFT_BACKEND=blob requires BLOB_READ_WRITE_TOKEN (e.g. from your Vercel Blob store)."
        );
      }
      singleton = new BlobDraftRepository();
    } else {
      singleton = new LocalFileDraftRepository(defaultDraftRoot());
    }
  }
  return singleton;
}

/** Test helper: reset singleton so the next {@link createDraftRepository} reconstructs from env. */
export function resetDraftRepositorySingleton(): void {
  singleton = null;
}
