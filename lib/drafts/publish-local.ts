import fs from "fs";
import path from "path";
import type { DraftMutationResult } from "@/lib/draft-action-result";
import { CONFLICT_MSG } from "@/lib/drafts/publish-messages";
import type { DraftStored } from "@/lib/drafts/types";
import { hashPublishedMdxSource } from "@/lib/drafts/source-hash";

/** Ensures resolved path is under `content/offerings` or `content/sites` (relative to cwd). */
export function assertWritablePublishedMdxPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const cwd = process.cwd();
  const offeringsRoot = path.resolve(path.join(cwd, "content", "offerings"));
  const sitesRoot = path.resolve(path.join(cwd, "content", "sites"));
  const relO = path.relative(offeringsRoot, resolved);
  const relS = path.relative(sitesRoot, resolved);
  const underOfferings = relO !== "" && !relO.startsWith("..") && !path.isAbsolute(relO);
  const underSites = relS !== "" && !relS.startsWith("..") && !path.isAbsolute(relS);
  if (!underOfferings && !underSites) {
    throw new Error("Refusing to write outside content/offerings or content/sites.");
  }
}

/**
 * Server-side source of truth for local publish: reload draft + published source in the action,
 * then call this with those values. Never trust client-only stale flags.
 */
export function tryPublishLocalDraft(params: {
  draft: DraftStored | null;
  publishedSource: string;
  publishedFilePath: string;
  onDeleteDraft: () => void;
}): DraftMutationResult {
  const { draft, publishedSource, publishedFilePath, onDeleteDraft } = params;

  if (!draft) {
    return { ok: false, error: "No draft to publish." };
  }

  const baseHash = draft.baseHash?.trim();
  if (!baseHash) {
    return {
      ok: false,
      error: "Draft is missing base hash metadata. Save the draft again, then publish.",
    };
  }

  const currentHash = hashPublishedMdxSource(publishedSource);
  if (currentHash !== baseHash) {
    return { ok: false, error: CONFLICT_MSG };
  }

  try {
    assertWritablePublishedMdxPath(publishedFilePath);
    fs.writeFileSync(publishedFilePath, draft.source, "utf8");
    onDeleteDraft();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}
