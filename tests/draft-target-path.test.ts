import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  draftBlobPathname,
  tryParseDraftBlobPathname,
} from "../lib/drafts/draft-target-path";

describe("draftBlobPathname / tryParseDraftBlobPathname", () => {
  it("roundtrips offering lesson path", () => {
    const target = {
      kind: "offeringLesson" as const,
      parentSlug: "investing-basics-2026-05",
      pageOrLessonSlug: "lesson-1",
    };
    const pathname = draftBlobPathname(target, "alice@example.com");
    assert.equal(pathname, "drafts/offerings/investing-basics-2026-05/lesson-1/alice-example-com.mdx");
    assert.deepEqual(tryParseDraftBlobPathname(pathname), target);
  });

  it("roundtrips site page index path", () => {
    const target = {
      kind: "sitePage" as const,
      parentSlug: "demo-site",
      pageOrLessonSlug: "index",
    };
    const pathname = draftBlobPathname(target, "Bob.User@Example.COM");
    assert.equal(pathname, "drafts/sites/demo-site/index/bob-user-example-com.mdx");
    assert.deepEqual(tryParseDraftBlobPathname(pathname), target);
  });

  it("returns null for malformed pathname", () => {
    assert.equal(tryParseDraftBlobPathname("drafts/evil"), null);
    assert.equal(tryParseDraftBlobPathname("drafts/offerings//x/y/z.mdx"), null);
  });
});
