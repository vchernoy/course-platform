import Link from "next/link";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { AdminMdxDraftEditor } from "@/components/admin/AdminMdxDraftEditor";
import { canAdminAccessOffering } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { getLocalFileDraftRepository } from "@/lib/drafts";
import type { LessonMdxPreviewSerialization } from "@/lib/mdx-lesson-preview-serialize";
import { serializeLessonMdxPreviewHtml } from "@/lib/mdx-lesson-preview-serialize";
import { loadOfferingResources } from "@/lib/offering-resources";
import { loadOfferingVideos } from "@/lib/offering-videos";
import { findLessonMeta, loadLessonSource, loadOffering } from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ offeringSlug: string; lessonSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offeringSlug, lessonSlug } = await params;
  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    return { title: "Edit draft · Admin" };
  }
  try {
    const offering = loadOffering(offeringSlug);
    const hit = findLessonMeta(offering, lessonSlug);
    if (!hit) return { title: "Edit draft · Admin" };
    return { title: `Edit draft · ${hit.title}` };
  } catch {
    return { title: "Edit draft · Admin" };
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

export default async function AdminLessonDraftEditPage({ params }: Props) {
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

  const publishedSource = loadLessonSource(offeringSlug, hit.moduleSlug, lessonSlug);
  const draft = email
    ? getLocalFileDraftRepository().getDraft(
        {
          kind: "offeringLesson",
          parentSlug: offeringSlug,
          pageOrLessonSlug: lessonSlug,
        },
        email
      )
    : null;

  const editorSource = draft?.source ?? publishedSource;
  const { videos, resources } = loadRegistriesSafe(offeringSlug);

  const initialPreview: LessonMdxPreviewSerialization = await serializeLessonMdxPreviewHtml({
    offeringSlug,
    source: editorSource,
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
        <span className="text-zinc-900">Edit draft · {hit.title}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">Edit lesson draft</h1>
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

      <p className="mt-4 text-sm text-zinc-600">
        {draft ? (
          <>
            Showing your{" "}
            <span className="font-medium text-zinc-800">local draft</span> (updated{" "}
            {draft.updatedAt}).{" "}
            <Link
              href={`/admin/offerings/${offeringSlug}/lessons/${lessonSlug}/preview`}
              className="text-emerald-700 underline-offset-2 hover:underline"
            >
              Preview-only page
            </Link>{" "}
            always starts from published Git source.
          </>
        ) : (
          <>
            No local draft yet — editing published source from disk. Save draft stores under{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">.data/drafts/</code> only.
          </>
        )}
      </p>

      <div className="mt-10">
        <AdminMdxDraftEditor
          key={draft ? `draft:${draft.updatedAt}` : "published"}
          variant="lesson"
          offeringSlug={offeringSlug}
          lessonSlug={lessonSlug}
          initialSource={editorSource}
          initialPreview={initialPreview}
          helpText={
            "Save draft writes YAML-frontmatter MDX under .data/drafts (development / self-hosted only; not durable on typical serverless hosts). " +
            "Preview uses temporary HTML serialization — see docs/admin-authoring.md. Published files in content/offerings are never modified here."
          }
        />
      </div>
    </main>
  );
}
