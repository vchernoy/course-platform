import path from "path";
import { LocalFileDraftRepository } from "@/lib/drafts/local-file-draft-repository";
import type { DraftRepository } from "@/lib/drafts/types";

export type {
  DraftRecord,
  DraftRepository,
  DraftStored,
  DraftTarget,
} from "@/lib/drafts/types";

export { LocalFileDraftRepository } from "@/lib/drafts/local-file-draft-repository";
export { sanitizeDraftEmailBasename } from "@/lib/drafts/email-filename";
export {
  parseDraftMdxFile,
  serializeDraftMdxFile,
  type DraftFrontmatterFields,
} from "@/lib/drafts/draft-frontmatter";

let singleton: LocalFileDraftRepository | null = null;

export function defaultDraftRoot(): string {
  return path.join(process.cwd(), ".data", "drafts");
}

/** Production wiring: local filesystem under `.data/drafts`. */
export function getLocalFileDraftRepository(): DraftRepository {
  if (!singleton) {
    singleton = new LocalFileDraftRepository(defaultDraftRoot());
  }
  return singleton;
}

/** Test helper: reset singleton so the next `getLocalFileDraftRepository()` uses a fresh default root. */
export function resetLocalFileDraftRepositorySingleton(): void {
  singleton = null;
}
