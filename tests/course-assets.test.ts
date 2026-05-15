import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolveUnderAssetsRoot, safeAssetFilePath } from "../lib/course-assets";
import { assertSafeAssetSegments, isSafeAssetSegment } from "../lib/slug";

describe("isSafeAssetSegment", () => {
  it("rejects traversal-looking segments", () => {
    assert.equal(isSafeAssetSegment(".."), false);
    assert.equal(isSafeAssetSegment("."), false);
    assert.equal(isSafeAssetSegment("a..b"), false);
  });

  it("allows typical filenames", () => {
    assert.equal(isSafeAssetSegment("chart.png"), true);
    assert.equal(isSafeAssetSegment("doc-v2.pdf"), true);
  });
});

describe("assertSafeAssetSegments", () => {
  it("throws on dot-dot segment", () => {
    assert.throws(() => assertSafeAssetSegments(["sub", "..", "x"]), /Invalid asset path segment/);
  });
});

describe("resolveUnderAssetsRoot", () => {
  it("returns null when normalized path escapes root", () => {
    const root = join(tmpdir(), "assets-root-test");
    mkdirSync(root, { recursive: true });
    try {
      assert.equal(resolveUnderAssetsRoot(root, ["..", "passwd"]), null);
      assert.equal(resolveUnderAssetsRoot(root, ["sub", "..", "..", "outside"]), null);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("resolves file inside root", () => {
    const root = mkdtempSync(join(tmpdir(), "asset-safe-"));
    try {
      mkdirSync(join(root, "nested"));
      const full = join(root, "nested", "f.png");
      writeFileSync(full, "x");
      const got = resolveUnderAssetsRoot(root, ["nested", "f.png"]);
      assert.equal(got, full);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("safeAssetFilePath", () => {
  it("returns null for invalid course slug", () => {
    assert.equal(safeAssetFilePath("../bad", ["x.png"]), null);
  });

  it("returns null for traversal segment before filesystem check", () => {
    assert.equal(safeAssetFilePath("investing-basics", ["..", "x"]), null);
  });
});
