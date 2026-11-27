import fs from "fs";
import path from "path";
import { allCollectionDirs } from "@/lib/content-roots";
import type { DraftMutationResult } from "@/lib/draft-action-result";
import { CONFLICT_MSG } from "@/lib/drafts/publish-messages";
import type { DraftStored } from "@/lib/drafts/types";
import { hashPublishedMdxSource } from "@/lib/drafts/source-hash";

/** Ensures resolved path is under `content/offerings` or `content/sites` of a content root. */
export function assertWritablePublishedMdxPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const inside = allCollectionDirs().some((dir) => {
    const rel = path.relative(path.resolve(dir), resolved);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  });
  if (!inside) {
    throw new Error("Refusing to write outside content/offerings or content/sites.");
  }
}

/**
 * Server-side source of truth for local publish: reload draft + published source in the action,
 * then call this with those values. Never trust client-only stale flags.
 */
export async function tryPublishLocalDraft(params: {
  draft: DraftStored | null;
  publishedSource: string;
  publishedFilePath: string;
  onDeleteDraft: () => void | Promise<void>;
}): Promise<DraftMutationResult> {
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
    await Promise.resolve(onDeleteDraft());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}
