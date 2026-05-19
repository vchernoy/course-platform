import {
  findLessonMeta,
  listOfferingSlugs,
  loadLessonSource,
  loadOffering,
  type OfferingMeta,
} from "@/lib/offerings";
import type { ContentRepository } from "@/lib/content-repository/types";

export class GitContentRepository implements ContentRepository {
  async listOfferings(): Promise<OfferingMeta[]> {
    const slugs = listOfferingSlugs();
    return Promise.all(slugs.map((slug) => loadOffering(slug)));
  }

  async getOffering(slug: string): Promise<OfferingMeta> {
    return loadOffering(slug);
  }

  async getLessonSource(offeringSlug: string, lessonSlug: string): Promise<string> {
    const offering = await this.getOffering(offeringSlug);
    const hit = findLessonMeta(offering, lessonSlug);
    if (!hit) {
      throw new Error(`Lesson not found in offering ${offeringSlug}: ${lessonSlug}`);
    }
    return loadLessonSource(offeringSlug, hit.moduleSlug, lessonSlug);
  }
}

export function createGitContentRepository(): GitContentRepository {
  return new GitContentRepository();
}
