import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateResourcesContent } from "../lib/offering-resources";

describe("validateResourcesContent", () => {
  it("accepts local paths with underscores and dots in filename segments", () => {
    const map = validateResourcesContent({
      resources: {
        "worksheet-1": {
          type: "local",
          label: "Sheet",
          path: "worksheets/roth_worksheet.pdf",
        },
        "chart-a": {
          type: "local",
          label: "Chart",
          path: "charts/chart-v1.png",
        },
      },
    });
    assert.deepEqual(map["worksheet-1"]!.pathSegments, ["worksheets", "roth_worksheet.pdf"]);
    assert.deepEqual(map["chart-a"]!.pathSegments, ["charts", "chart-v1.png"]);
  });

  it("accepts external entries", () => {
    const map = validateResourcesContent({
      resources: {
        ref: {
          type: "external",
          label: "Docs",
          url: "https://example.com/doc",
          warning: "Third-party site.",
        },
      },
    });
    assert.equal(map.ref!.type, "external");
    assert.equal((map.ref as { url: string }).url, "https://example.com/doc");
  });

  it("rejects parent-directory segments in asset path", () => {
    assert.throws(
      () =>
        validateResourcesContent({
          resources: {
            x: { type: "local", label: "L", path: "folder/../evil.pdf" },
          },
        }),
      /invalid segment/
    );
  });

  it("rejects non-http(s) urls", () => {
    assert.throws(
      () =>
        validateResourcesContent({
          resources: {
            x: { type: "external", label: "L", url: "javascript:alert(1)" },
          },
        }),
      /external url must be http/
    );
  });

  it("rejects invalid resources asset id key", () => {
    assert.throws(
      () =>
        validateResourcesContent({
          resources: {
            Bad_Key: { type: "local", label: "L", path: "a.pdf" },
          },
        }),
      /invalid resources key/
    );
  });

  it("rejects empty path segment (double slash)", () => {
    assert.throws(
      () =>
        validateResourcesContent({
          resources: {
            x: { type: "local", label: "L", path: "ok//bad.pdf" },
          },
        }),
      /empty segments/
    );
  });
});
