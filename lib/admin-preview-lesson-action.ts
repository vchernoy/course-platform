"use server";

import { forbidden } from "next/navigation";
import { canAdminAccessOffering } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import type { LessonMdxPreviewSerialization } from "@/lib/mdx-lesson-preview-serialize";
import { serializeLessonMdxPreviewHtml } from "@/lib/mdx-lesson-preview-serialize";
import { loadOfferingResources } from "@/lib/offering-resources";
import { loadOfferingVideos } from "@/lib/offering-videos";
import { findLessonMeta, loadOffering } from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

export async function previewLessonMdxAction(
  offeringSlug: string,
  lessonSlug: string,
  mdx: string
): Promise<LessonMdxPreviewSerialization> {
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

  let videos = {};
  let resources = {};
  try {
    videos = loadOfferingVideos(offeringSlug);
  } catch {
    videos = {};
  }
  try {
    resources = loadOfferingResources(offeringSlug);
  } catch {
    resources = {};
  }

  return serializeLessonMdxPreviewHtml({
    offeringSlug,
    source: mdx,
    videos,
    resources,
  });
}
