import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { CONFLICT_MSG } from "../lib/drafts/publish-messages";
import { assertWritablePublishedMdxPath, tryPublishLocalDraft } from "../lib/drafts/publish-local";
import { hashPublishedMdxSource } from "../lib/drafts/source-hash";

describe("hashPublishedMdxSource", () => {
  it("matches SHA-256 hex for UTF-8 input", () => {
    assert.equal(
      hashPublishedMdxSource(""),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert.equal(
      hashPublishedMdxSource("# Hello\n"),
      hashPublishedMdxSource("# Hello\n")
    );
  });
});

describe("assertWritablePublishedMdxPath", () => {
  it("throws for paths outside content/offerings and content/sites", () => {
    assert.throws(() => assertWritablePublishedMdxPath(path.join(os.tmpdir(), "evil.mdx")), /Refusing to write/);
  });
});

describe("tryPublishLocalDraft", () => {
  async function withTempProject(fn: () => void | Promise<void>) {
    const prev = process.cwd();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "publish-local-"));
    process.chdir(root);
    try {
      await Promise.resolve(fn());
    } finally {
      process.chdir(prev);
    }
  }

  it("returns error when draft missing", async () => {
    const r = await tryPublishLocalDraft({
      draft: null,
      publishedSource: "x",
      publishedFilePath: "/nope",
      onDeleteDraft: () => {},
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /No draft/);
  });

  it("returns error when draft missing baseHash", async () => {
    const r = await tryPublishLocalDraft({
      draft: {
        source: "new",
        updatedAt: "t",
        updatedBy: "u",
        baseHash: null,
      },
      publishedSource: "old",
      publishedFilePath: "/nope",
      onDeleteDraft: () => {},
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /base hash/);
  });

  it("refuses publish on hash mismatch without writing", async () => {
    await withTempProject(async () => {
      fs.mkdirSync(path.join("content", "offerings", "o", "m"), { recursive: true });
      const p = path.join(process.cwd(), "content", "offerings", "o", "m", "l.mdx");
      fs.writeFileSync(p, "# B\n", "utf8");
      let deleted = false;
      const draft = {
        source: "# Draft\n",
        updatedAt: "t",
        updatedBy: "u",
        baseHash: hashPublishedMdxSource("# A\n"),
      };
      const result = await tryPublishLocalDraft({
        draft,
        publishedSource: fs.readFileSync(p, "utf8"),
        publishedFilePath: p,
        onDeleteDraft: () => {
          deleted = true;
        },
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error, CONFLICT_MSG);
      assert.equal(fs.readFileSync(p, "utf8"), "# B\n");
      assert.equal(deleted, false);
    });
  });

  it("overwrites published file and deletes draft on success", async () => {
    await withTempProject(async () => {
      fs.mkdirSync(path.join("content", "sites", "s", "pages"), { recursive: true });
      const p = path.join(process.cwd(), "content", "sites", "s", "pages", "about.mdx");
      const published = "# Original\n";
      fs.writeFileSync(p, published, "utf8");
      const baseHash = hashPublishedMdxSource(published);
      let deleted = false;
      const draft = {
        source: "# Published from draft\n",
        updatedAt: "t",
        updatedBy: "u",
        baseHash,
      };
      const result = await tryPublishLocalDraft({
        draft,
        publishedSource: fs.readFileSync(p, "utf8"),
        publishedFilePath: p,
        onDeleteDraft: async () => {
          deleted = true;
        },
      });
      assert.equal(result.ok, true);
      assert.equal(fs.readFileSync(p, "utf8"), "# Published from draft\n");
      assert.equal(deleted, true);
    });
  });
});
