import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileSitePageMdx } from "@/lib/mdx-site-compile";
import {
  effectiveSiteVisibility,
  isPublicSite,
  loadSite,
  loadSitePageSource,
} from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ siteSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug } = await params;
  if (!isSafeSlug(siteSlug)) {
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
    return { title: site.title, robots };
  } catch {
    return { title: "Not found" };
  }
}

export default async function SiteIndexPage({ params }: Props) {
  const { siteSlug } = await params;

  if (!isSafeSlug(siteSlug)) {
    notFound();
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
    source = loadSitePageSource(siteSlug, "index");
  } catch {
    notFound();
  }

  const content = await compileSitePageMdx({ siteSlug, source });

  return (
    <article className="lesson-mdx">
      {content}
    </article>
  );
}
