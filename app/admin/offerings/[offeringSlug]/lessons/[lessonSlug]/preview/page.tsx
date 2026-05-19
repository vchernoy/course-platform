import Link from "next/link";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { LessonMdxPreviewForm } from "@/components/admin/LessonMdxPreviewForm";
import { canAdminAccessOffering } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { createGitContentRepository } from "@/lib/content-repository";
import type { LessonMdxPreviewSerialization } from "@/lib/mdx-lesson-preview-serialize";
import { serializeLessonMdxPreviewHtml } from "@/lib/mdx-lesson-preview-serialize";
import { loadOfferingResources } from "@/lib/offering-resources";
import { loadOfferingVideos } from "@/lib/offering-videos";
import { findLessonMeta, loadOffering } from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ offeringSlug: string; lessonSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offeringSlug, lessonSlug } = await params;
  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    return { title: "Preview · Admin" };
  }
  try {
    const offering = loadOffering(offeringSlug);
    const hit = findLessonMeta(offering, lessonSlug);
    if (!hit) return { title: "Preview · Admin" };
    return { title: `Preview · ${hit.title}` };
  } catch {
    return { title: "Preview · Admin" };
  }
}

function loadRegistriesSafe(offeringSlug: string) {
  let videos = {};
  let resources = {};
  try {
    videos = loadOfferingVideos(offeringSlug);
  } catch {
    videos = {};
  }
  try {
    resources = loadOfferingResources(offeringSlug);
  } catch {
    resources = {};
  }
  return { videos, resources };
}

export default async function AdminLessonPreviewPage({ params }: Props) {
  const { offeringSlug, lessonSlug } = await params;

  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    notFound();
  }

  const email = await getCurrentUserEmail();
  if (!canAdminAccessOffering(email, offeringSlug)) {
    forbidden();
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    notFound();
  }

  const hit = findLessonMeta(offering, lessonSlug);
  if (!hit) {
    notFound();
  }

  const repo = createGitContentRepository();
  let rawSource: string;
  try {
    rawSource = await repo.getLessonSource(offeringSlug, lessonSlug);
  } catch {
    notFound();
  }

  const { videos, resources } = loadRegistriesSafe(offeringSlug);

  const initialPreview: LessonMdxPreviewSerialization = await serializeLessonMdxPreviewHtml({
    offeringSlug,
    source: rawSource,
    videos,
    resources,
  });

  return (
    <main>
      <nav className="text-sm text-zinc-600">
        <Link href="/admin/offerings" className="hover:text-zinc-900">
          Offerings
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <Link href={`/admin/offerings/${offeringSlug}`} className="hover:text-zinc-900">
          {offering.title}
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <span className="text-zinc-900">Preview · {hit.title}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        Lesson preview
      </h1>
      <p className="mt-1 text-sm text-zinc-600">{hit.title}</p>
      <dl className="mt-4 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
        <div>
          <dt className="font-medium text-zinc-500">Offering</dt>
          <dd>{offeringSlug}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Lesson slug</dt>
          <dd>{lessonSlug}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Module</dt>
          <dd>{hit.moduleSlug}</dd>
        </div>
      </dl>

      <div className="mt-10">
        <LessonMdxPreviewForm
          key={`${offeringSlug}:${lessonSlug}`}
          offeringSlug={offeringSlug}
          lessonSlug={lessonSlug}
          initialSource={rawSource}
          initialPreview={initialPreview}
        />
      </div>
    </main>
  );
}
