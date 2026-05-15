import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStudentsContent } from "../lib/students";

describe("validateStudentsContent", () => {
  it("accepts valid entries", () => {
    const cfg = validateStudentsContent({
      students: [{ email: "u@test.dev", courses: ["investing-basics"] }],
    });
    assert.equal(cfg.students.length, 1);
  });

  it("rejects invalid course slug in allowlist", () => {
    assert.throws(
      () =>
        validateStudentsContent({
          students: [{ email: "u@test.dev", courses: ["Investing Bad"] }],
        }),
      /invalid course slug/
    );
  });
});
