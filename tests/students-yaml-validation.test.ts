import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessOfferingWithConfig,
  studentAllowsOffering,
  validateStudentsContent,
} from "../lib/students";
import type { StudentsConfig } from "../lib/students";

const sample: StudentsConfig = {
  students: [
    { email: "alice@example.com", offerings: ["investing-basics-2026-05"] },
    { email: "Bob@Example.com", offerings: ["other-offering"] },
  ],
};

describe("studentAllowsOffering", () => {
  it("matches email case-insensitively", () => {
    assert.equal(
      studentAllowsOffering(sample, "ALICE@EXAMPLE.COM", "investing-basics-2026-05"),
      true
    );
    assert.equal(studentAllowsOffering(sample, "bob@example.com", "other-offering"), true);
  });

  it("denies unknown email or offering", () => {
    assert.equal(studentAllowsOffering(sample, "alice@example.com", "other-offering"), false);
    assert.equal(studentAllowsOffering(sample, "carol@example.com", "investing-basics-2026-05"), false);
  });
});

describe("canAccessOfferingWithConfig", () => {
  it("denies without email", () => {
    assert.equal(canAccessOfferingWithConfig(undefined, "investing-basics-2026-05", sample), false);
  });

  it("denies invalid offering slug without hitting allowlist", () => {
    assert.equal(canAccessOfferingWithConfig("alice@example.com", "../evil", sample), false);
    assert.equal(canAccessOfferingWithConfig("alice@example.com", "BAD_SLUG", sample), false);
  });

  it("allows valid slug and enrolled email", () => {
    assert.equal(
      canAccessOfferingWithConfig("alice@example.com", "investing-basics-2026-05", sample),
      true
    );
  });
});

describe("validateStudentsContent legacy courses key", () => {
  it("accepts legacy courses array as offerings", () => {
    const cfg = validateStudentsContent({
      students: [{ email: "u@test.dev", courses: ["investing-basics-2026-05"] }],
    });
    assert.deepEqual(cfg.students[0]!.offerings, ["investing-basics-2026-05"]);
  });
});

describe("validateStudentsContent offerings", () => {
  it("accepts valid entries", () => {
    const cfg = validateStudentsContent({
      students: [{ email: "u@test.dev", offerings: ["investing-basics-2026-05"] }],
    });
    assert.equal(cfg.students.length, 1);
  });

  it("rejects invalid offering slug in allowlist", () => {
    assert.throws(
      () =>
        validateStudentsContent({
          students: [{ email: "u@test.dev", offerings: ["Investing Bad"] }],
        }),
      /invalid offering slug/
    );
  });
});
