import MiniSearch from "minisearch";
import { cache } from "react";
import {
  extractMarkdownHeadingsOutsideFences,
  stripLessonMdxForSearchBody,
} from "@/lib/offering-search-text";
import { loadLessonSource, loadOffering, type OfferingMeta } from "@/lib/offerings";

export type OfferingLessonSearchHit = {
  lessonSlug: string;
  lessonTitle: string;
  moduleTitle: string;
  url: string;
  score: number;
};

type SearchDoc = {
  lessonSlug: string;
  lessonTitle: string;
  moduleTitle: string;
  url: string;
  headings: string;
  text: string;
};

function buildMiniSearchForOffering(offeringSlug: string, offering: OfferingMeta): MiniSearch<SearchDoc> {
  const miniSearch = new MiniSearch<SearchDoc>({
    idField: "lessonSlug",
    fields: ["lessonTitle", "moduleTitle", "headings", "text"],
    storeFields: ["lessonTitle", "moduleTitle", "url"],
    searchOptions: {
      boost: { lessonTitle: 2.5, moduleTitle: 1.8, headings: 1.4, text: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  const docs: SearchDoc[] = [];

  for (const mod of offering.modules) {
    for (const les of mod.lessons) {
      const source = loadLessonSource(offeringSlug, mod.slug, les.slug);
      const headingTitles = extractMarkdownHeadingsOutsideFences(source);
      const body = stripLessonMdxForSearchBody(source);
      docs.push({
        lessonSlug: les.slug,
        lessonTitle: les.title,
        moduleTitle: mod.title,
        url: `/offerings/${offeringSlug}/${les.slug}`,
        headings: headingTitles.join(" "),
        text: body,
      });
    }
  }

  miniSearch.addAll(docs);
  return miniSearch;
}

const getOfferingMiniSearch = cache((offeringSlug: string) => {
  const offering = loadOffering(offeringSlug);
  return buildMiniSearchForOffering(offeringSlug, offering);
});

/** Scoped full-text search over one offering's lesson MDX (titles, headings, body, fenced code). */
export function searchOfferingLessons(offeringSlug: string, query: string): OfferingLessonSearchHit[] {
  const q = query.trim();
  if (!q) return [];

  const mini = getOfferingMiniSearch(offeringSlug);
  const results = mini.search(q);

  return results.map((r) => ({
    lessonSlug: String(r.id),
    lessonTitle: r.lessonTitle as string,
    moduleTitle: r.moduleTitle as string,
    url: r.url as string,
    score: r.score,
  }));
}
