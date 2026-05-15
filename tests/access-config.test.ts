import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessCourseWithConfig, studentAllowsCourse } from "../lib/students";
import type { StudentsConfig } from "../lib/students";

const sample: StudentsConfig = {
  students: [
    { email: "alice@example.com", courses: ["investing-basics"] },
    { email: "Bob@Example.com", courses: ["other-course"] },
  ],
};

describe("studentAllowsCourse", () => {
  it("matches email case-insensitively", () => {
    assert.equal(studentAllowsCourse(sample, "ALICE@EXAMPLE.COM", "investing-basics"), true);
    assert.equal(studentAllowsCourse(sample, "bob@example.com", "other-course"), true);
  });

  it("denies unknown email or course", () => {
    assert.equal(studentAllowsCourse(sample, "alice@example.com", "other-course"), false);
    assert.equal(studentAllowsCourse(sample, "carol@example.com", "investing-basics"), false);
  });
});

describe("canAccessCourseWithConfig", () => {
  it("denies without email", () => {
    assert.equal(canAccessCourseWithConfig(undefined, "investing-basics", sample), false);
  });

  it("denies invalid course slug without hitting allowlist", () => {
    assert.equal(canAccessCourseWithConfig("alice@example.com", "../evil", sample), false);
    assert.equal(canAccessCourseWithConfig("alice@example.com", "BAD_SLUG", sample), false);
  });

  it("allows valid slug and enrolled email", () => {
    assert.equal(
      canAccessCourseWithConfig("alice@example.com", "investing-basics", sample),
      true
    );
  });
});
