import { del, get, head, list, put } from "@vercel/blob";
import { draftBlobPathname, tryParseDraftBlobPathname } from "@/lib/drafts/draft-target-path";
import { parseDraftMdxFile, serializeDraftMdxFile } from "@/lib/drafts/draft-frontmatter";
import { sanitizeDraftEmailBasename } from "@/lib/drafts/email-filename";
import { hashPublishedMdxSource } from "@/lib/drafts/source-hash";
import type { DraftRecord, DraftRepository, DraftStored, DraftTarget } from "@/lib/drafts/types";
import { normalizeEmail } from "@/lib/students";

/** Internal adapter so tests can mock blob SDK calls. */
export type BlobDraftSdk = {
  put: typeof put;
  get: typeof get;
  head: typeof head;
  del: typeof del;
  list: typeof list;
};

const defaultSdk: BlobDraftSdk = { put, get, head, del, list };

async function readableStreamToUtf8(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
    return out;
  } finally {
    reader.releaseLock();
  }
}

export class BlobDraftRepository implements DraftRepository {
  private readonly sdk: BlobDraftSdk;

  constructor(sdk: BlobDraftSdk = defaultSdk) {
    this.sdk = sdk;
  }

  private blobOptions() {
    return { token: process.env.BLOB_READ_WRITE_TOKEN };
  }

  /** Load raw MDX file bytes as UTF-8; hide blob transport inside this class. */
  private async loadDraftRawUtf8(pathname: string): Promise<string | null> {
    const opts = this.blobOptions();
    const got = await this.sdk.get(pathname, {
      access: "private",
      ...opts,
    });
    if (!got || got.statusCode !== 200 || !got.stream) {
      return null;
    }
    try {
      return await readableStreamToUtf8(got.stream);
    } catch {
      try {
        const meta = await this.sdk.head(pathname, opts);
        const token = opts.token;
        const res = await fetch(meta.url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return null;
        return await res.text();
      } catch {
        return null;
      }
    }
  }

  async getDraft(target: DraftTarget, adminEmail: string): Promise<DraftStored | null> {
    const pathname = draftBlobPathname(target, adminEmail);
    const raw = await this.loadDraftRawUtf8(pathname);
    if (raw === null) return null;
    try {
      const { meta, body } = parseDraftMdxFile(raw);
      return {
        source: body,
        updatedAt: meta.updatedAt,
        updatedBy: meta.updatedBy,
        baseHash: meta.baseHash?.trim() ? meta.baseHash.trim() : null,
      };
    } catch {
      return null;
    }
  }

  async saveDraft(
    target: DraftTarget,
    adminEmail: string,
    source: string,
    publishedSourceBody: string
  ): Promise<void> {
    const norm = normalizeEmail(adminEmail);
    const pathname = draftBlobPathname(target, adminEmail);

    let baseHash = hashPublishedMdxSource(publishedSourceBody);
    const existing = await this.getDraft(target, adminEmail);
    if (existing?.baseHash?.trim()) {
      baseHash = existing.baseHash.trim();
    }

    const iso = new Date().toISOString();
    const file = serializeDraftMdxFile(
      {
        updatedAt: iso,
        updatedBy: norm,
        baseHash,
      },
      source
    );

    await this.sdk.put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/markdown",
      ...this.blobOptions(),
    });
  }

  async deleteDraft(target: DraftTarget, adminEmail: string): Promise<void> {
    const pathname = draftBlobPathname(target, adminEmail);
    await this.sdk.del(pathname, this.blobOptions());
  }

  private async listAllWithPrefix(prefix: string): Promise<Array<{ pathname: string }>> {
    const blobs: Array<{ pathname: string }> = [];
    let cursor: string | undefined;
    const opts = this.blobOptions();
    for (;;) {
      const page = await this.sdk.list({
        prefix,
        cursor,
        ...opts,
      });
      for (const b of page.blobs) {
        blobs.push({ pathname: b.pathname });
      }
      if (!page.hasMore || !page.cursor) break;
      cursor = page.cursor;
    }
    return blobs;
  }

  async listDraftsForAdmin(adminEmail: string): Promise<DraftRecord[]> {
    let basename: string;
    try {
      basename = `${sanitizeDraftEmailBasename(adminEmail)}.mdx`;
    } catch {
      return [];
    }

    const suffix = `/${basename}`;
    const paths = [
      ...(await this.listAllWithPrefix("drafts/offerings/")),
      ...(await this.listAllWithPrefix("drafts/sites/")),
    ].filter((p) => p.pathname.endsWith(suffix));

    const out: DraftRecord[] = [];

    for (const { pathname } of paths) {
      const draftTarget = tryParseDraftBlobPathname(pathname);
      if (!draftTarget) continue;
      const raw = await this.loadDraftRawUtf8(pathname);
      if (raw === null) continue;
      try {
        const { meta, body } = parseDraftMdxFile(raw);
        out.push({
          ...draftTarget,
          source: body,
          updatedAt: meta.updatedAt,
          updatedBy: meta.updatedBy,
          baseHash: meta.baseHash?.trim() ? meta.baseHash.trim() : null,
        });
      } catch {
        /* skip corrupt blobs */
      }
    }

    out.sort((a, b) => {
      const ak = `${a.kind}:${a.parentSlug}:${a.pageOrLessonSlug}`;
      const bk = `${b.kind}:${b.parentSlug}:${b.pageOrLessonSlug}`;
      return ak.localeCompare(bk);
    });

    return out;
  }
}
