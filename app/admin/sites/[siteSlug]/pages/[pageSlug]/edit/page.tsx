import Link from "next/link";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { AdminMdxDraftEditor } from "@/components/admin/AdminMdxDraftEditor";
import { canAdminAccessSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { createDraftRepository, getDraftStatus } from "@/lib/drafts";
import {
  draftSaveStoragePhrase,
  localPublishDisabledReason,
} from "@/lib/drafts/deployment-policy";
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
  if (!email || !canAdminAccessSite(email, siteSlug)) {
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

  let repo;
  try {
    repo = createDraftRepository();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <main className="max-w-xl">
        <p className="text-sm font-medium text-red-800">Draft backend misconfigured</p>
        <p className="mt-2 text-sm text-red-700">{msg}</p>
      </main>
    );
  }

  const publishedSource = loadSitePageSource(siteSlug, pageSlug);
  const draftTarget = {
    kind: "sitePage" as const,
    parentSlug: siteSlug,
    pageOrLessonSlug: pageSlug,
  };

  const draft = await repo.getDraft(draftTarget, email);

  const draftStatus = await getDraftStatus(draftTarget, email, publishedSource, repo);

  const publishBlockedReason = localPublishDisabledReason();
  const storagePhrase = draftSaveStoragePhrase();

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
            Showing your saved <span className="font-medium text-zinc-800">draft</span> (updated{" "}
            {draft.updatedAt}).{" "}
            {publishBlockedReason ? (
              <>
                <span className="font-medium text-zinc-800">Publish locally</span> is disabled in this deployment (see
                server message when attempting publish).
              </>
            ) : (
              <>
                <span className="font-medium text-zinc-800">Publish locally</span> writes this page MDX back to{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs">content/sites/</code> when the base hash matches
                (local dev / self-hosted only).
              </>
            )}
          </>
        ) : (
          <>
            No draft yet — textarea shows published source. Save draft snapshots the published body hash in{" "}
            <span className="font-medium text-zinc-800">{storagePhrase}</span>.
            {publishBlockedReason ? (
              <> Publish locally is unavailable on this deployment.</>
            ) : (
              <>
                {" "}
                Publish locally overwrites only this{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs">pages/*.mdx</code> file under{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs">content/sites/</code>.
              </>
            )}
          </>
        )}
      </p>

      <div className="mt-10">
        <AdminMdxDraftEditor
          key={`${draft ? `draft:${draft.updatedAt}` : "published"}:${draftStatus.currentHash}:${draftStatus.baseHash ?? "nobase"}`}
          variant="site"
          siteSlug={siteSlug}
          pageSlug={pageSlug}
          initialSource={editorSource}
          initialPreview={initialPreview}
          draftStatus={draftStatus}
          localPublishDisabledReason={publishBlockedReason}
          helpText={
            `Save draft stores YAML-frontmatter in ${storagePhrase} with a base hash of the published file (Phase 3B). ` +
            (publishBlockedReason
              ? "Publish locally is disabled on this deployment (filesystem publish to content/ is unsupported). Future Git-backed publish will replace it for production. "
              : "Publish locally overwrites only this page .mdx under content/sites when the hash still matches — server rechecks every time (local dev / self-hosted only). ") +
            "No Git commit. See docs/admin-authoring.md."
          }
        />
      </div>
    </main>
  );
}
