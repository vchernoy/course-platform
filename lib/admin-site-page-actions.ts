"use server";

import { forbidden } from "next/navigation";
import { canAdminMutateSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import type { DraftMutationResult } from "@/lib/draft-action-result";
import {
  createSitePageOnDisk,
  deleteSitePageOnDisk,
  type CreateSitePageInput,
} from "@/lib/admin-site-page-crud";
import { sitePageFilesystemMutationBlockedReason } from "@/lib/drafts/deployment-policy";
import { loadSite } from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

export async function createSitePageAction(
  siteSlug: string,
  input: CreateSitePageInput
): Promise<DraftMutationResult> {
  const blocked = sitePageFilesystemMutationBlockedReason();
  if (blocked) {
    return { ok: false, error: blocked };
  }

  const email = await getCurrentUserEmail();
  if (!email || !canAdminMutateSite(email, siteSlug)) {
    forbidden();
  }

  if (!isSafeSlug(siteSlug)) {
    return { ok: false, error: "Invalid site slug." };
  }

  try {
    loadSite(siteSlug);
  } catch {
    return { ok: false, error: "Site not found." };
  }

  return createSitePageOnDisk(process.cwd(), siteSlug, {
    title: input.title,
    slug: input.slug,
    addToNavigation: Boolean(input.addToNavigation),
  });
}

export async function deleteSitePageAction(
  siteSlug: string,
  pageSlug: string
): Promise<DraftMutationResult> {
  const blocked = sitePageFilesystemMutationBlockedReason();
  if (blocked) {
    return { ok: false, error: blocked };
  }

  const email = await getCurrentUserEmail();
  if (!email || !canAdminMutateSite(email, siteSlug)) {
    forbidden();
  }

  if (!isSafeSlug(siteSlug)) {
    return { ok: false, error: "Invalid site slug." };
  }

  try {
    loadSite(siteSlug);
  } catch {
    return { ok: false, error: "Site not found." };
  }

  return deleteSitePageOnDisk(process.cwd(), siteSlug, pageSlug);
}
