"use server";

import { forbidden } from "next/navigation";
import { canAdminAccessSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import {
  LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE,
  isVercelDeployment,
  vercelFilesystemDraftMutationBlockedReason,
} from "@/lib/drafts/deployment-policy";
import { createDraftRepository, tryPublishLocalDraft } from "@/lib/drafts";
import type { DraftMutationResult } from "@/lib/draft-action-result";
import type { DraftRepository, DraftTarget } from "@/lib/drafts/types";
import { listSitePageSlugs, loadSite, loadSitePageSource, sitePageFilePath } from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

type DraftRepoInit =
  | { kind: "ok"; repo: DraftRepository }
  | { kind: "err"; error: string };

function initDraftRepo(): DraftRepoInit {
  try {
    return { kind: "ok", repo: createDraftRepository() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { kind: "err", error: msg };
  }
}

export async function saveSitePageDraftAction(
  siteSlug: string,
  pageSlug: string,
  source: string
): Promise<DraftMutationResult> {
  const blocked = vercelFilesystemDraftMutationBlockedReason();
  if (blocked) return { ok: false, error: blocked };

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

  let publishedSource: string;
  try {
    publishedSource = loadSitePageSource(siteSlug, pageSlug);
  } catch {
    return { ok: false, error: "Site page file missing on disk." };
  }

  const target: DraftTarget = {
    kind: "sitePage",
    parentSlug: siteSlug,
    pageOrLessonSlug: pageSlug,
  };

  const init = initDraftRepo();
  if (init.kind === "err") return { ok: false, error: init.error };

  try {
    await init.repo.saveDraft(target, email, source, publishedSource);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export async function publishSitePageDraftLocally(
  siteSlug: string,
  pageSlug: string
): Promise<DraftMutationResult> {
  if (isVercelDeployment()) {
    return { ok: false, error: LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE };
  }

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

  let publishedSource: string;
  try {
    publishedSource = loadSitePageSource(siteSlug, pageSlug);
  } catch {
    return { ok: false, error: "Site page file missing on disk." };
  }

  const target: DraftTarget = {
    kind: "sitePage",
    parentSlug: siteSlug,
    pageOrLessonSlug: pageSlug,
  };

  const init = initDraftRepo();
  if (init.kind === "err") return { ok: false, error: init.error };
  const { repo } = init;

  const draft = await repo.getDraft(target, email);
  const publishedFilePath = sitePageFilePath(siteSlug, pageSlug);

  return tryPublishLocalDraft({
    draft,
    publishedSource,
    publishedFilePath,
    onDeleteDraft: () => repo.deleteDraft(target, email),
  });
}

export async function discardSitePageDraftAction(
  siteSlug: string,
  pageSlug: string
): Promise<DraftMutationResult> {
  const blocked = vercelFilesystemDraftMutationBlockedReason();
  if (blocked) return { ok: false, error: blocked };

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

  const init = initDraftRepo();
  if (init.kind === "err") return { ok: false, error: init.error };

  try {
    await init.repo.deleteDraft(target, email);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}
