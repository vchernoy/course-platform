import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEmail } from "../lib/students";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  });

  it("does not alter inner spacing email parts oddly", () => {
    assert.equal(normalizeEmail("a+b@test.org"), "a+b@test.org");
  });
});
