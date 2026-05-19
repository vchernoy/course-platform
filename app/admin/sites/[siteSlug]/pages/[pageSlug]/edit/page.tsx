import Link from "next/link";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { AdminMdxDraftEditor } from "@/components/admin/AdminMdxDraftEditor";
import { canAdminAccessSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { getLocalFileDraftRepository } from "@/lib/drafts";
import type { SiteMdxPreviewSerialization } from "@/lib/mdx-site-preview-serialize";
import { serializeSiteMdxPreviewHtml } from "@/lib/mdx-site-preview-serialize";
import { listSitePageSlugs, loadSite, loadSitePageSource } from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ siteSlug: string; pageSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug, pageSlug } = await params;
  if (!isSafeSlug(siteSlug) || (pageSlug !== "index" && !isSafeSlug(pageSlug))) {
    return { title: "Edit draft · Admin" };
  }
  try {
    loadSite(siteSlug);
    const pages = listSitePageSlugs(siteSlug);
    if (!pages.includes(pageSlug)) return { title: "Edit draft · Admin" };
    return { title: `Edit draft · ${siteSlug} · ${pageSlug}` };
  } catch {
    return { title: "Edit draft · Admin" };
  }
}

export default async function AdminSitePageDraftEditPage({ params }: Props) {
  const { siteSlug, pageSlug } = await params;

  if (!isSafeSlug(siteSlug) || (pageSlug !== "index" && !isSafeSlug(pageSlug))) {
    notFound();
  }

  const email = await getCurrentUserEmail();
  if (!canAdminAccessSite(email, siteSlug)) {
    forbidden();
  }

  let site;
  try {
    site = loadSite(siteSlug);
  } catch {
    notFound();
  }

  const pages = listSitePageSlugs(siteSlug);
  if (!pages.includes(pageSlug)) {
    notFound();
  }

  const publishedSource = loadSitePageSource(siteSlug, pageSlug);
  const draft = email
    ? getLocalFileDraftRepository().getDraft(
        {
          kind: "sitePage",
          parentSlug: siteSlug,
          pageOrLessonSlug: pageSlug,
        },
        email
      )
    : null;

  const editorSource = draft?.source ?? publishedSource;

  const initialPreview: SiteMdxPreviewSerialization = await serializeSiteMdxPreviewHtml({
    siteSlug,
    source: editorSource,
  });

  const navTitle =
    pageSlug === "index"
      ? "Home"
      : site.navigation.find((n) => n.page === pageSlug)?.title ?? pageSlug;

  return (
    <main>
      <nav className="text-sm text-zinc-600">
        <Link href="/admin/sites" className="hover:text-zinc-900">
          Sites
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <Link href={`/admin/sites/${siteSlug}`} className="hover:text-zinc-900">
          {site.title}
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <span className="text-zinc-900">Edit draft · {navTitle}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">Edit site page draft</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {navTitle} (<code className="rounded bg-zinc-100 px-1 text-xs">{pageSlug}</code>)
      </p>

      <p className="mt-4 text-sm text-zinc-600">
        {draft ? (
          <>
            Showing your <span className="font-medium text-zinc-800">local draft</span> (updated{" "}
            {draft.updatedAt}).
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
          variant="site"
          siteSlug={siteSlug}
          pageSlug={pageSlug}
          initialSource={editorSource}
          initialPreview={initialPreview}
          helpText={
            "Save draft writes YAML-frontmatter MDX under .data/drafts (development / self-hosted only; not durable on typical serverless hosts). " +
            "Preview uses compileSitePageMdx plus temporary HTML serialization — see docs/admin-authoring.md. Published files in content/sites are never modified here."
          }
        />
      </div>
    </main>
  );
}
