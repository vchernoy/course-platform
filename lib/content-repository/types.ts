import type { OfferingMeta } from "@/lib/offerings";

/** In-memory lesson draft (future persistence / preview). */
export type LessonDraft = {
  offeringSlug: string;
  lessonSlug: string;
  source: string;
};

export interface ContentRepository {
  listOfferings(): Promise<OfferingMeta[]>;
  getOffering(slug: string): Promise<OfferingMeta>;
  getLessonSource(offeringSlug: string, lessonSlug: string): Promise<string>;

  saveDraft?(...args: unknown[]): Promise<void>;
  publish?(...args: unknown[]): Promise<void>;
}
