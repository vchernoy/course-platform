import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  parseDraftMdxFile,
  serializeDraftMdxFile,
} from "../lib/drafts/draft-frontmatter";
import { sanitizeDraftEmailBasename } from "../lib/drafts/email-filename";
import { LocalFileDraftRepository } from "../lib/drafts/local-file-draft-repository";

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
  it("roundtrips body and metadata", () => {
    const meta = { updatedAt: "2026-05-19T12:00:00.000Z", updatedBy: "a@b.co" };
    const body = '# Hello\n\n**MDX** stays "as-is".\n';
    const file = serializeDraftMdxFile(meta, body);
    const parsed = parseDraftMdxFile(file);
    assert.deepEqual(parsed.meta, meta);
    assert.equal(parsed.body, body);
  });

  it("rejects files without frontmatter", () => {
    assert.throws(() => parseDraftMdxFile("# hi"), /must begin with YAML frontmatter/);
  });

  it("rejects missing updatedAt", () => {
    const raw = "---\nupdatedBy: x@y.co\n---\n\nbody\n";
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
    assert.equal(r.getDraft(target, "u@example.org"), null);
    r.saveDraft(target, "u@example.org", "# Draft\n");
    const got = r.getDraft(target, "u@example.org");
    assert.ok(got);
    assert.equal(got!.source.trim(), "# Draft");
    assert.equal(got!.updatedBy, "u@example.org");
    assert.ok(got!.updatedAt.length > 10);
    r.deleteDraft(target, "u@example.org");
    assert.equal(r.getDraft(target, "u@example.org"), null);
  });

  it("rejects invalid parent slug (path traversal / unsafe segments)", () => {
    const r = repo();
    assert.throws(
      () =>
        r.saveDraft(
          { kind: "offeringLesson", parentSlug: "..", pageOrLessonSlug: "lesson-1" },
          "u@example.org",
          "x"
        ),
      /Invalid draft parent slug/
    );
    assert.throws(
      () =>
        r.saveDraft(
          { kind: "sitePage", parentSlug: "demo-site", pageOrLessonSlug: "../oops" },
          "u@example.org",
          "x"
        ),
      /Invalid site page slug/
    );
  });

  it("listDraftsForAdmin finds drafts for this admin only", () => {
    const r = repo();
    r.saveDraft(
      { kind: "sitePage", parentSlug: "demo-site", pageOrLessonSlug: "about" },
      "alice@example.com",
      "A"
    );
    r.saveDraft(
      { kind: "sitePage", parentSlug: "demo-site", pageOrLessonSlug: "index" },
      "bob@example.org",
      "B"
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
