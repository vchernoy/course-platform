"use server";

import { forbidden } from "next/navigation";
import { canAdminAccessSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import type { SiteMdxPreviewSerialization } from "@/lib/mdx-site-preview-serialize";
import { serializeSiteMdxPreviewHtml } from "@/lib/mdx-site-preview-serialize";
import { listSitePageSlugs, loadSite } from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

export async function previewSiteMdxAction(
  siteSlug: string,
  pageSlug: string,
  mdx: string
): Promise<SiteMdxPreviewSerialization> {
  const email = await getCurrentUserEmail();
  if (!email || !canAdminAccessSite(email, siteSlug)) {
    forbidden();
  }

  if (!isSafeSlug(siteSlug)) {
    return { ok: false, error: "Invalid site slug." };
  }
  if (pageSlug !== "index" && !isSafeSlug(pageSlug)) {
    return { ok: false, error: "Invalid page slug." };
  }

  try {
    loadSite(siteSlug);
  } catch {
    return { ok: false, error: "Site not found." };
  }

  const pages = listSitePageSlugs(siteSlug);
  if (!pages.includes(pageSlug)) {
    return { ok: false, error: "Page not found on disk." };
  }

  return serializeSiteMdxPreviewHtml({ siteSlug, source: mdx });
}
