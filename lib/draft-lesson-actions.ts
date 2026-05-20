"use server";

import { forbidden } from "next/navigation";
import { canAdminAccessOffering } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import {
  LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE,
  isVercelDeployment,
  vercelFilesystemDraftMutationBlockedReason,
} from "@/lib/drafts/deployment-policy";
import { createDraftRepository, tryPublishLocalDraft } from "@/lib/drafts";
import type { DraftMutationResult } from "@/lib/draft-action-result";
import type { DraftRepository, DraftTarget } from "@/lib/drafts/types";
import {
  findLessonMeta,
  getLessonFilePath,
  loadLessonSource,
  loadOffering,
} from "@/lib/offerings";
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

export async function saveLessonDraftAction(
  offeringSlug: string,
  lessonSlug: string,
  source: string
): Promise<DraftMutationResult> {
  const blocked = vercelFilesystemDraftMutationBlockedReason();
  if (blocked) return { ok: false, error: blocked };

  const email = await getCurrentUserEmail();
  if (!email || !canAdminAccessOffering(email, offeringSlug)) {
    forbidden();
  }

  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    return { ok: false, error: "Invalid slug parameters." };
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    return { ok: false, error: "Offering not found." };
  }

  const hit = findLessonMeta(offering, lessonSlug);
  if (!hit) {
    return { ok: false, error: "Lesson not found in offering metadata." };
  }

  let publishedSource: string;
  try {
    publishedSource = loadLessonSource(offeringSlug, hit.moduleSlug, lessonSlug);
  } catch {
    return { ok: false, error: "Lesson file missing on disk." };
  }

  const target: DraftTarget = {
    kind: "offeringLesson",
    parentSlug: offeringSlug,
    pageOrLessonSlug: lessonSlug,
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

export async function publishLessonDraftLocally(
  offeringSlug: string,
  lessonSlug: string
): Promise<DraftMutationResult> {
  if (isVercelDeployment()) {
    return { ok: false, error: LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE };
  }

  const email = await getCurrentUserEmail();
  if (!email || !canAdminAccessOffering(email, offeringSlug)) {
    forbidden();
  }

  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    return { ok: false, error: "Invalid slug parameters." };
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    return { ok: false, error: "Offering not found." };
  }

  const hit = findLessonMeta(offering, lessonSlug);
  if (!hit) {
    return { ok: false, error: "Lesson not found in offering metadata." };
  }

  let publishedSource: string;
  try {
    publishedSource = loadLessonSource(offeringSlug, hit.moduleSlug, lessonSlug);
  } catch {
    return { ok: false, error: "Lesson file missing on disk." };
  }

  const target: DraftTarget = {
    kind: "offeringLesson",
    parentSlug: offeringSlug,
    pageOrLessonSlug: lessonSlug,
  };

  const init = initDraftRepo();
  if (init.kind === "err") return { ok: false, error: init.error };
  const { repo } = init;

  const draft = await repo.getDraft(target, email);
  const publishedFilePath = getLessonFilePath(offeringSlug, hit.moduleSlug, lessonSlug);

  return tryPublishLocalDraft({
    draft,
    publishedSource,
    publishedFilePath,
    onDeleteDraft: () => repo.deleteDraft(target, email),
  });
}

export async function discardLessonDraftAction(
  offeringSlug: string,
  lessonSlug: string
): Promise<DraftMutationResult> {
  const blocked = vercelFilesystemDraftMutationBlockedReason();
  if (blocked) return { ok: false, error: blocked };

  const email = await getCurrentUserEmail();
  if (!email || !canAdminAccessOffering(email, offeringSlug)) {
    forbidden();
  }

  if (!isSafeSlug(offeringSlug) || !isSafeSlug(lessonSlug)) {
    return { ok: false, error: "Invalid slug parameters." };
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    return { ok: false, error: "Offering not found." };
  }

  if (!findLessonMeta(offering, lessonSlug)) {
    return { ok: false, error: "Lesson not found in offering metadata." };
  }

  const target: DraftTarget = {
    kind: "offeringLesson",
    parentSlug: offeringSlug,
    pageOrLessonSlug: lessonSlug,
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
