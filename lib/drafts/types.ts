/** Target for a locally stored MDX draft (Phase 3A: filesystem only). */
export type DraftTarget =
  | { kind: "offeringLesson"; parentSlug: string; pageOrLessonSlug: string }
  | { kind: "sitePage"; parentSlug: string; pageOrLessonSlug: string };

/** Body + metadata returned by {@link DraftRepository.getDraft}. */
export type DraftStored = {
  source: string;
  updatedAt: string;
  updatedBy: string;
  /** Missing on legacy Phase 3A drafts until re-saved (Phase 3B). */
  baseHash: string | null;
};

/** One draft plus its target (used by {@link DraftRepository.listDraftsForAdmin}). */
export type DraftRecord = DraftTarget & DraftStored;

export interface DraftRepository {
  getDraft(target: DraftTarget, adminEmail: string): DraftStored | null;
  /** New drafts record {@link hashPublishedMdxSource}(publishedSourceBody); existing drafts keep original baseHash. */
  saveDraft(target: DraftTarget, adminEmail: string, source: string, publishedSourceBody: string): void;
  deleteDraft(target: DraftTarget, adminEmail: string): void;
  listDraftsForAdmin(adminEmail: string): DraftRecord[];
}
