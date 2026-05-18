import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeHeadingFragment, resolveLessonMdxHref } from "@/lib/mdx-internal-links";

describe("isSafeHeadingFragment", () => {
  it("accepts slug-like fragments", () => {
    assert.equal(isSafeHeadingFragment("risk-and-return"), true);
    assert.equal(isSafeHeadingFragment("a1"), true);
  });

  it("rejects empty, uppercase, spaces, and specials", () => {
    assert.equal(isSafeHeadingFragment(""), false);
    assert.equal(isSafeHeadingFragment("Risk"), false);
    assert.equal(isSafeHeadingFragment("a b"), false);
    assert.equal(isSafeHeadingFragment("a_b"), false);
    assert.equal(isSafeHeadingFragment("a/../b"), false);
  });
});

describe("resolveLessonMdxHref", () => {
  const offering = "investing-basics-2026-05";

  it("rewrites lesson: without hash", () => {
    assert.equal(
      resolveLessonMdxHref("lesson:lesson-2", offering),
      `/offerings/${offering}/lesson-2`
    );
  });

  it("rewrites lesson: with hash", () => {
    assert.equal(
      resolveLessonMdxHref("lesson:lesson-2#risk-and-return", offering),
      `/offerings/${offering}/lesson-2#risk-and-return`
    );
  });

  it("rewrites offering overview with hash", () => {
    assert.equal(
      resolveLessonMdxHref("offering:investing-basics-2026-05#overview", offering),
      "/offerings/investing-basics-2026-05#overview"
    );
  });

  it("rewrites offering lesson with hash", () => {
    assert.equal(
      resolveLessonMdxHref(
        "offering:investing-basics-2026-05/lesson-2#risk-and-return",
        offering
      ),
      "/offerings/investing-basics-2026-05/lesson-2#risk-and-return"
    );
  });

  it("leaves href unchanged when fragment is unsafe", () => {
    assert.equal(
      resolveLessonMdxHref("lesson:lesson-2#Bad", offering),
      "lesson:lesson-2#Bad"
    );
  });

  it("leaves external and relative links unchanged", () => {
    assert.equal(
      resolveLessonMdxHref("https://example.com", offering),
      "https://example.com"
    );
    assert.equal(resolveLessonMdxHref("#calculator", offering), "#calculator");
  });
});
