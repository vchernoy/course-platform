/** Returned by publish server actions when running on Vercel (filesystem publish unsupported). */
export const LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE =
  "Local publish is not supported in this deployment. Use local development/self-hosted mode, or configure a Git-backed publish backend.";

export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Draft backend from env: unset or `local` → filesystem `.data/drafts`; `blob` → Vercel Blob.
 */
export function resolveDraftBackend(): "local" | "blob" {
  const raw = process.env.DRAFT_BACKEND?.trim().toLowerCase();
  if (!raw || raw === "local") return "local";
  if (raw === "blob") return "blob";
  throw new Error(`Invalid DRAFT_BACKEND: ${JSON.stringify(process.env.DRAFT_BACKEND)} (expected local or blob).`);
}

/** Non-null disables Publish locally in UI (same string enforced in server actions). */
export function localPublishDisabledReason(): string | null {
  if (!isVercelDeployment()) return null;
  return LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE;
}

/** Published site page create/delete (direct `content/sites` writes): blocked on Vercel with the same message as local publish. */
export function sitePageFilesystemMutationBlockedReason(): string | null {
  if (isVercelDeployment()) return LOCAL_PUBLISH_BLOCKED_ON_VERCEL_MESSAGE;
  return null;
}

/**
 * When Vercel uses filesystem draft storage, save/discard cannot work (read-only /var/task).
 */
export function vercelFilesystemDraftMutationBlockedReason(): string | null {
  if (!isVercelDeployment()) return null;
  try {
    if (resolveDraftBackend() !== "local") return null;
  } catch {
    return `Invalid DRAFT_BACKEND: ${JSON.stringify(process.env.DRAFT_BACKEND)}`;
  }
  return (
    "Draft save and discard use the server filesystem (.data/drafts), which is not writable on Vercel. " +
    "Set DRAFT_BACKEND=blob and configure Vercel Blob (see BLOB_READ_WRITE_TOKEN in project env)."
  );
}

/** Short phrase for edit-page help text (never leaks Blob SDK types). */
export function draftSaveStoragePhrase(): string {
  try {
    if (resolveDraftBackend() === "blob") {
      return "configured blob draft storage";
    }
  } catch {
    /* invalid env — neutral wording below */
  }
  return ".data/drafts on this host";
}
