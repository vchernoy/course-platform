import type { Metadata } from "next";
import type { ImgHTMLAttributes } from "react";
import { notFound } from "next/navigation";
import { LessonPager } from "@/components/course/LessonPager";
import { LessonTableOfContents } from "@/components/course/LessonTableOfContents";
import { PortalBreadcrumbs } from "@/components/portal/PortalBreadcrumbs";
import { extractLessonTocItems, type LessonTocItem } from "@/lib/mdx-lesson-toc";
import { compileLessonMdxContent, prepareLessonMdxSource } from "@/lib/mdx-lesson-compile";
import { loadOfferingResources } from "@/lib/offering-resources";
import { loadOfferingVideos } from "@/lib/offering-videos";
import {
  findLessonMeta,
  getLessonNeighbors,
  loadLessonSource,
  loadOffering,
} from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ offeringSlug: string; lessonSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offeringSlug, lessonSlug } = await params;
  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    return { title: "Not found" };
  }
  try {
    const offering = loadOffering(offeringSlug);
    const hit = findLessonMeta(offering, lessonSlug);
    if (!hit) return { title: "Lesson not found" };
    return { title: `${hit.title} · ${offering.title}` };
  } catch {
    return { title: "Offering not found" };
  }
}

export default async function LessonPage({ params }: Props) {
  const { offeringSlug, lessonSlug } = await params;

  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    notFound();
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    notFound();
  }

  const hit = findLessonMeta(offering, lessonSlug);
  if (!hit) notFound();

  if (!isSafeSlug(hit.moduleSlug)) {
    notFound();
  }

  let source: string;
  try {
    source = loadLessonSource(offeringSlug, hit.moduleSlug, lessonSlug);
  } catch {
    notFound();
  }

  let videos;
  try {
    videos = loadOfferingVideos(offeringSlug);
  } catch {
    notFound();
  }

  let resources;
  try {
    resources = loadOfferingResources(offeringSlug);
  } catch {
    notFound();
  }

  const mdxSource = prepareLessonMdxSource(source, offeringSlug);

  let tocItems: LessonTocItem[] = [];
  try {
    tocItems = await extractLessonTocItems(mdxSource);
  } catch {
    tocItems = [];
  }

  const content = await compileLessonMdxContent({
    offeringSlug,
    source,
    videos,
    resources,
  });

  const { prev, next } = getLessonNeighbors(offering, lessonSlug);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:py-12">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
        <main className="mx-auto min-w-0 max-w-3xl lg:mx-0">
          <PortalBreadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: offering.title, href: `/offerings/${offeringSlug}` },
              { label: hit.title },
            ]}
          />
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
            {hit.title}
          </h1>
          <article className="lesson-mdx mt-10">{content}</article>
          <LessonPager courseSlug={offeringSlug} prev={prev} next={next} />
        </main>
        <aside className="hidden lg:block">
          <div className="sticky top-24 pt-2">
            <LessonTableOfContents items={tocItems} />
          </div>
        </aside>
      </div>
    </div>
  );
}
