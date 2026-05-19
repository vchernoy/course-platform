import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { compileSitePageMdx } from "@/lib/mdx-site-compile";
import {
  effectiveSiteVisibility,
  isPublicSite,
  loadSite,
  loadSitePageSource,
} from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ siteSlug: string; pageSlug: string }>;
};

function pageTitleForMeta(siteTitle: string, pageSlug: string, navigation: { title: string; page: string }[]) {
  const hit = navigation.find((n) => n.page === pageSlug);
  if (hit) return `${hit.title} · ${siteTitle}`;
  return `${pageSlug} · ${siteTitle}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug, pageSlug } = await params;
  if (!isSafeSlug(siteSlug) || !isSafeSlug(pageSlug)) {
    return { title: "Not found" };
  }
  if (pageSlug === "index") {
    return { title: "Not found" };
  }
  try {
    const site = loadSite(siteSlug);
    if (!isPublicSite(site)) {
      return { title: "Not found" };
    }
    const visibility = effectiveSiteVisibility(site);
    const robots =
      visibility === "unlisted"
        ? ({ index: false, follow: false } satisfies Metadata["robots"])
        : undefined;
    return {
      title: pageTitleForMeta(site.title, pageSlug, site.navigation),
      robots,
    };
  } catch {
    return { title: "Not found" };
  }
}

export default async function SitePage({ params }: Props) {
  const { siteSlug, pageSlug } = await params;

  if (!isSafeSlug(siteSlug) || !isSafeSlug(pageSlug)) {
    notFound();
  }

  if (pageSlug === "index") {
    redirect(`/s/${siteSlug}`);
  }

  let site;
  try {
    site = loadSite(siteSlug);
  } catch {
    notFound();
  }

  if (!isPublicSite(site)) {
    notFound();
  }

  let source: string;
  try {
    source = loadSitePageSource(siteSlug, pageSlug);
  } catch {
    notFound();
  }

  const content = await compileSitePageMdx(source);

  return (
    <article className="lesson-mdx">
      {content}
    </article>
  );
}
