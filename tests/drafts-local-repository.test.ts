import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  parseDraftMdxFile,
  serializeDraftMdxFile,
} from "../lib/drafts/draft-frontmatter";
import { getDraftStatus } from "../lib/drafts/draft-status";
import { sanitizeDraftEmailBasename } from "../lib/drafts/email-filename";
import { LocalFileDraftRepository } from "../lib/drafts/local-file-draft-repository";
import { hashPublishedMdxSource } from "../lib/drafts/source-hash";

describe("sanitizeDraftEmailBasename", () => {
  it("maps typical gmail addresses to hyphenated basename", () => {
    assert.equal(sanitizeDraftEmailBasename("vchernoy@gmail.com"), "vchernoy-gmail-com");
    assert.equal(sanitizeDraftEmailBasename("User.Name@Example.COM"), "user-name-example-com");
  });

  it("rejects invalid emails", () => {
    assert.throws(() => sanitizeDraftEmailBasename(""), /Invalid email/);
    assert.throws(() => sanitizeDraftEmailBasename("noperiod"), /Invalid email/);
    assert.throws(() => sanitizeDraftEmailBasename("@nodomain.com"), /Invalid email/);
  });
});

describe("parseDraftMdxFile / serializeDraftMdxFile", () => {
  it("roundtrips body and metadata including baseHash", () => {
    const meta = {
      updatedAt: "2026-05-19T12:00:00.000Z",
      updatedBy: "a@b.co",
      baseHash: "abc123deadbeef",
    };
    const body = '# Hello\n\n**MDX** stays "as-is".\n';
    const file = serializeDraftMdxFile(meta, body);
    const parsed = parseDraftMdxFile(file);
    assert.deepEqual(parsed.meta.updatedAt, meta.updatedAt);
    assert.deepEqual(parsed.meta.updatedBy, meta.updatedBy);
    assert.equal(parsed.meta.baseHash, meta.baseHash);
    assert.equal(parsed.body, body);
  });

  it("parses legacy drafts without baseHash", () => {
    const raw =
      "---\nupdatedAt: x\nupdatedBy: y@z.co\n---\n\nbody\n";
    const parsed = parseDraftMdxFile(raw);
    assert.equal(parsed.meta.baseHash, undefined);
    assert.equal(parsed.body.trim(), "body");
  });

  it("rejects files without frontmatter", () => {
    assert.throws(() => parseDraftMdxFile("# hi"), /must begin with YAML frontmatter/);
  });

  it("rejects missing updatedAt", () => {
    const raw = "---\nupdatedBy: x@y.co\nbaseHash: z\n---\n\nbody\n";
    assert.throws(() => parseDraftMdxFile(raw), /updatedAt/);
  });
});

describe("LocalFileDraftRepository", () => {
  function repo(): LocalFileDraftRepository {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "draft-repo-"));
    return new LocalFileDraftRepository(dir);
  }

  it("saveDraft getDraft deleteDraft roundtrip", () => {
    const r = repo();
    const target = {
      kind: "offeringLesson" as const,
      parentSlug: "investing-basics-2026-05",
      pageOrLessonSlug: "lesson-1",
    };
    const published = "# Published\n";
    assert.equal(r.getDraft(target, "u@example.org"), null);
    r.saveDraft(target, "u@example.org", "# Draft\n", published);
    const got = r.getDraft(target, "u@example.org");
    assert.ok(got);
    assert.equal(got!.source.trim(), "# Draft");
    assert.equal(got!.updatedBy, "u@example.org");
    assert.ok(got!.updatedAt.length > 10);
    assert.equal(got!.baseHash, hashPublishedMdxSource(published));
    r.deleteDraft(target, "u@example.org");
    assert.equal(r.getDraft(target, "u@example.org"), null);
  });

  it("preserves original baseHash on subsequent saves", () => {
    const r = repo();
    const target = {
      kind: "offeringLesson" as const,
      parentSlug: "investing-basics-2026-05",
      pageOrLessonSlug: "lesson-1",
    };
    const pub1 = "# Original\n";
    const h1 = hashPublishedMdxSource(pub1);
    r.saveDraft(target, "u@example.org", "# D1\n", pub1);
    assert.equal(r.getDraft(target, "u@example.org")!.baseHash, h1);
    r.saveDraft(target, "u@example.org", "# D2\n", "# Totally different published\n");
    assert.equal(r.getDraft(target, "u@example.org")!.baseHash, h1);
    assert.equal(r.getDraft(target, "u@example.org")!.source.trim(), "# D2");
  });

  it("rejects invalid parent slug (path traversal / unsafe segments)", () => {
    const r = repo();
    assert.throws(
      () =>
        r.saveDraft(
          { kind: "offeringLesson", parentSlug: "..", pageOrLessonSlug: "lesson-1" },
          "u@example.org",
          "x",
          "y"
        ),
      /Invalid draft parent slug/
    );
    assert.throws(
      () =>
        r.saveDraft(
          { kind: "sitePage", parentSlug: "demo-site", pageOrLessonSlug: "../oops" },
          "u@example.org",
          "x",
          "y"
        ),
      /Invalid site page slug/
    );
  });

  it("listDraftsForAdmin finds drafts for this admin only", () => {
    const r = repo();
    r.saveDraft(
      { kind: "sitePage", parentSlug: "demo-site", pageOrLessonSlug: "about" },
      "alice@example.com",
      "A",
      "pub-a\n"
    );
    r.saveDraft(
      { kind: "sitePage", parentSlug: "demo-site", pageOrLessonSlug: "index" },
      "bob@example.org",
      "B",
      "pub-b\n"
    );

    const alice = r.listDraftsForAdmin("alice@example.com");
    assert.equal(alice.length, 1);
    assert.equal(alice[0]!.kind, "sitePage");
    assert.equal(alice[0]!.parentSlug, "demo-site");
    assert.equal(alice[0]!.pageOrLessonSlug, "about");
    assert.equal(alice[0]!.source, "A");

    const bob = r.listDraftsForAdmin("bob@example.org");
    assert.equal(bob.length, 1);
    assert.equal(bob[0]!.pageOrLessonSlug, "index");
  });
});

describe("getDraftStatus", () => {
  function repo(): LocalFileDraftRepository {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "draft-status-"));
    return new LocalFileDraftRepository(dir);
  }

  const target = { kind: "sitePage" as const, parentSlug: "demo-site", pageOrLessonSlug: "about" };

  it("reports stale when published changes after draft base", () => {
    const r = repo();
    const pub = "# One\n";
    r.saveDraft(target, "a@b.co", "draft", pub);
    const stOk = getDraftStatus(target, "a@b.co", pub, r);
    assert.equal(stOk.hasDraft, true);
    assert.equal(stOk.isStale, false);

    const stStale = getDraftStatus(target, "a@b.co", "# Two\n", r);
    assert.equal(stStale.isStale, true);
    assert.equal(stStale.currentHash, hashPublishedMdxSource("# Two\n"));
  });

  it("treats legacy draft without baseHash as stale", () => {
    const r = repo();
    const fp = path.join(
      r.draftRoot,
      "sites",
      "demo-site",
      "about",
      `${sanitizeDraftEmailBasename("a@b.co")}.mdx`
    );
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(
      fp,
      "---\nupdatedAt: t\nupdatedBy: a@b.co\n---\n\nlegacy body\n",
      "utf8"
    );
    const st = getDraftStatus(target, "a@b.co", "# Published\n", r);
    assert.equal(st.hasDraft, true);
    assert.equal(st.isStale, true);
    assert.equal(st.baseHash, null);
  });
});
