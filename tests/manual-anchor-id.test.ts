import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeManualAnchorId } from "@/lib/mdx-internal-links";

describe("isSafeManualAnchorId (manual Anchor / AnchorBlock)", () => {
  it("accepts slug-like ids", () => {
    assert.equal(isSafeManualAnchorId("five-year-rule"), true);
    assert.equal(isSafeManualAnchorId("roth-clock"), true);
    assert.equal(isSafeManualAnchorId("a1"), true);
  });

  it("rejects invalid ids", () => {
    assert.equal(isSafeManualAnchorId(""), false);
    assert.equal(isSafeManualAnchorId("BadCaps"), false);
    assert.equal(isSafeManualAnchorId("bad_space"), false);
    assert.equal(isSafeManualAnchorId("bad.dot"), false);
  });
});
