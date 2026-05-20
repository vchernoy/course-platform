import fs from "fs";
import path from "path";
import { parseDraftMdxFile, serializeDraftMdxFile } from "@/lib/drafts/draft-frontmatter";
import { sanitizeDraftEmailBasename } from "@/lib/drafts/email-filename";
import { hashPublishedMdxSource } from "@/lib/drafts/source-hash";
import type { DraftRecord, DraftRepository, DraftStored, DraftTarget } from "@/lib/drafts/types";
import { isSafeSlug } from "@/lib/slug";
import { normalizeEmail } from "@/lib/students";

function ensureUnderDraftRoot(draftRootAbs: string, fileAbs: string): void {
  const rel = path.relative(draftRootAbs, fileAbs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Resolved draft path escapes draft root.");
  }
}

function assertValidPageOrLessonSlug(kind: DraftTarget["kind"], pageOrLessonSlug: string): void {
  if (kind === "sitePage") {
    if (pageOrLessonSlug !== "index" && !isSafeSlug(pageOrLessonSlug)) {
      throw new Error(`Invalid site page slug: ${JSON.stringify(pageOrLessonSlug)}`);
    }
    return;
  }
  if (!isSafeSlug(pageOrLessonSlug)) {
    throw new Error(`Invalid lesson slug: ${JSON.stringify(pageOrLessonSlug)}`);
  }
}

function assertValidDraftTarget(target: DraftTarget): void {
  if (!isSafeSlug(target.parentSlug)) {
    throw new Error(`Invalid draft parent slug: ${JSON.stringify(target.parentSlug)}`);
  }
  assertValidPageOrLessonSlug(target.kind, target.pageOrLessonSlug);
}

export class LocalFileDraftRepository implements DraftRepository {
  readonly draftRoot: string;

  constructor(draftRoot: string) {
    this.draftRoot = path.resolve(draftRoot);
  }

  private draftFilePath(target: DraftTarget, adminEmail: string): string {
    assertValidDraftTarget(target);
    const basename = `${sanitizeDraftEmailBasename(adminEmail)}.mdx`;
    const segment = target.kind === "offeringLesson" ? "offerings" : "sites";
    const fp = path.join(
      this.draftRoot,
      segment,
      target.parentSlug,
      target.pageOrLessonSlug,
      basename
    );
    const resolved = path.resolve(fp);
    ensureUnderDraftRoot(path.resolve(this.draftRoot), resolved);
    return resolved;
  }

  getDraft(target: DraftTarget, adminEmail: string): DraftStored | null {
    const fp = this.draftFilePath(target, adminEmail);
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, "utf8");
    const { meta, body } = parseDraftMdxFile(raw);
    return {
      source: body,
      updatedAt: meta.updatedAt,
      updatedBy: meta.updatedBy,
      baseHash: meta.baseHash?.trim() ? meta.baseHash.trim() : null,
    };
  }

  saveDraft(target: DraftTarget, adminEmail: string, source: string, publishedSourceBody: string): void {
    const norm = normalizeEmail(adminEmail);
    const fp = this.draftFilePath(target, adminEmail);
    fs.mkdirSync(path.dirname(fp), { recursive: true });

    let baseHash = hashPublishedMdxSource(publishedSourceBody);
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, "utf8");
        const { meta } = parseDraftMdxFile(raw);
        if (meta.baseHash?.trim()) {
          baseHash = meta.baseHash.trim();
        }
      } catch {
        /* new draft or corrupt file — keep computed baseHash */
      }
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
    fs.writeFileSync(fp, file, "utf8");
  }

  deleteDraft(target: DraftTarget, adminEmail: string): void {
    const fp = this.draftFilePath(target, adminEmail);
    if (!fs.existsSync(fp)) return;
    fs.unlinkSync(fp);
  }

  listDraftsForAdmin(adminEmail: string): DraftRecord[] {
    let basename: string;
    try {
      basename = `${sanitizeDraftEmailBasename(adminEmail)}.mdx`;
    } catch {
      return [];
    }

    const out: DraftRecord[] = [];

    const scanBranch = (segment: "offerings" | "sites", kind: DraftTarget["kind"]) => {
      const branchRoot = path.join(this.draftRoot, segment);
      if (!fs.existsSync(branchRoot)) return;
      const parents = fs.readdirSync(branchRoot, { withFileTypes: true });
      for (const pEnt of parents) {
        if (!pEnt.isDirectory()) continue;
        const parentSlug = pEnt.name;
        if (!isSafeSlug(parentSlug)) continue;
        const parentPath = path.join(branchRoot, parentSlug);
        const children = fs.readdirSync(parentPath, { withFileTypes: true });
        for (const cEnt of children) {
          if (!cEnt.isDirectory()) continue;
          const pageOrLessonSlug = cEnt.name;
          try {
            assertValidPageOrLessonSlug(kind, pageOrLessonSlug);
          } catch {
            continue;
          }
          const fp = path.join(parentPath, pageOrLessonSlug, basename);
          if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) continue;
          try {
            const raw = fs.readFileSync(fp, "utf8");
            const { meta, body } = parseDraftMdxFile(raw);
            const target: DraftTarget =
              kind === "offeringLesson"
                ? {
                    kind: "offeringLesson",
                    parentSlug,
                    pageOrLessonSlug,
                  }
                : {
                    kind: "sitePage",
                    parentSlug,
                    pageOrLessonSlug,
                  };
            out.push({
              ...target,
              source: body,
              updatedAt: meta.updatedAt,
              updatedBy: meta.updatedBy,
              baseHash: meta.baseHash?.trim() ? meta.baseHash.trim() : null,
            });
          } catch {
            /* skip corrupt draft files */
          }
        }
      }
    };

    scanBranch("offerings", "offeringLesson");
    scanBranch("sites", "sitePage");

    out.sort((a, b) => {
      const ak = `${a.kind}:${a.parentSlug}:${a.pageOrLessonSlug}`;
      const bk = `${b.kind}:${b.parentSlug}:${b.pageOrLessonSlug}`;
      return ak.localeCompare(bk);
    });

    return out;
  }
}
