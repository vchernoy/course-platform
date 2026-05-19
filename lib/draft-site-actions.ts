"use server";

import { forbidden } from "next/navigation";
import { canAdminAccessSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { getLocalFileDraftRepository } from "@/lib/drafts";
import type { DraftMutationResult } from "@/lib/draft-action-result";
import type { DraftTarget } from "@/lib/drafts/types";
import { listSitePageSlugs, loadSite } from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

export async function saveSitePageDraftAction(
  siteSlug: string,
  pageSlug: string,
  source: string
): Promise<DraftMutationResult> {
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

  const target: DraftTarget = {
    kind: "sitePage",
    parentSlug: siteSlug,
    pageOrLessonSlug: pageSlug,
  };

  try {
    getLocalFileDraftRepository().saveDraft(target, email, source);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export async function discardSitePageDraftAction(
  siteSlug: string,
  pageSlug: string
): Promise<DraftMutationResult> {
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

  const target: DraftTarget = {
    kind: "sitePage",
    parentSlug: siteSlug,
    pageOrLessonSlug: pageSlug,
  };

  try {
    getLocalFileDraftRepository().deleteDraft(target, email);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}
