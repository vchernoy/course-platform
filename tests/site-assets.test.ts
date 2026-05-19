import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSiteAssetHref,
  rewriteSiteAssetUrls,
  safeSiteAssetFilePath,
} from "../lib/site-assets";

describe("rewriteSiteAssetUrls", () => {
  it("rewrites markdown asset paths to site API", () => {
    const src = "See ![x](../assets/chart.png) and [y](../assets/doc.pdf).";
    const out = rewriteSiteAssetUrls(src, "demo-site");
    assert.ok(out.includes("](/api/site-assets/demo-site/chart.png)"));
    assert.ok(out.includes("](/api/site-assets/demo-site/doc.pdf)"));
  });

  it("no-op when site slug is unsafe", () => {
    const src = "![](../assets/x.png)";
    assert.equal(rewriteSiteAssetUrls(src, "../evil"), src);
  });
});

describe("buildSiteAssetHref", () => {
  it("encodes path segments", () => {
    assert.equal(
      buildSiteAssetHref("demo-site", "foo/bar baz.png"),
      "/api/site-assets/demo-site/foo/bar%20baz.png"
    );
  });

  it("passes through http(s) and absolute paths", () => {
    assert.equal(buildSiteAssetHref("demo-site", "https://example.com/x.png"), "https://example.com/x.png");
    assert.equal(buildSiteAssetHref("demo-site", "/static/x.png"), "/static/x.png");
  });
});

describe("safeSiteAssetFilePath", () => {
  it("returns null for invalid site slug", () => {
    assert.equal(safeSiteAssetFilePath("../bad", ["x.png"]), null);
  });

  it("returns null for traversal segment", () => {
    assert.equal(safeSiteAssetFilePath("demo-site", ["..", "x"]), null);
  });
});
