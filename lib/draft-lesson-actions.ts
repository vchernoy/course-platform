"use server";

import { forbidden } from "next/navigation";
import { canAdminAccessOffering } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { getLocalFileDraftRepository } from "@/lib/drafts";
import type { DraftMutationResult } from "@/lib/draft-action-result";
import type { DraftTarget } from "@/lib/drafts/types";
import { findLessonMeta, loadOffering } from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

export async function saveLessonDraftAction(
  offeringSlug: string,
  lessonSlug: string,
  source: string
): Promise<DraftMutationResult> {
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

  try {
    getLocalFileDraftRepository().saveDraft(target, email, source);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export async function discardLessonDraftAction(
  offeringSlug: string,
  lessonSlug: string
): Promise<DraftMutationResult> {
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

  try {
    getLocalFileDraftRepository().deleteDraft(target, email);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}
