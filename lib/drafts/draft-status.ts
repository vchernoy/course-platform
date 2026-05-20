import type { DraftRepository, DraftTarget } from "@/lib/drafts/types";
import { hashPublishedMdxSource } from "@/lib/drafts/source-hash";

export type DraftStatus = {
  hasDraft: boolean;
  isStale: boolean;
  baseHash: string | null;
  currentHash: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

/**
 * Read-only draft vs published comparison for admin UI.
 * Stale when published body hash differs from draft baseHash, or when draft lacks baseHash (legacy).
 */
export async function getDraftStatus(
  target: DraftTarget,
  adminEmail: string,
  currentPublishedSource: string,
  repo: DraftRepository
): Promise<DraftStatus> {
  const currentHash = hashPublishedMdxSource(currentPublishedSource);
  const draft = await repo.getDraft(target, adminEmail);
  if (!draft) {
    return {
      hasDraft: false,
      isStale: false,
      baseHash: null,
      currentHash,
      updatedAt: null,
      updatedBy: null,
    };
  }

  const baseHash = draft.baseHash;
  if (!baseHash) {
    return {
      hasDraft: true,
      isStale: true,
      baseHash: null,
      currentHash,
      updatedAt: draft.updatedAt,
      updatedBy: draft.updatedBy,
    };
  }

  const isStale = currentHash !== baseHash;
  return {
    hasDraft: true,
    isStale,
    baseHash,
    currentHash,
    updatedAt: draft.updatedAt,
    updatedBy: draft.updatedBy,
  };
}
