import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateSiteContent } from "../lib/sites";

describe("validateSiteContent", () => {
  it("accepts minimal valid site.yaml shape", () => {
    const meta = validateSiteContent({
      title: "Hello",
      visibility: "public",
      navigation: [
        { title: "Home", page: "index" },
        { title: "About", page: "about" },
      ],
    });
    assert.equal(meta.title, "Hello");
    assert.equal(meta.visibility, "public");
    assert.equal(meta.navigation.length, 2);
  });

  it("defaults visibility omitted", () => {
    const meta = validateSiteContent({
      title: "T",
      navigation: [],
    });
    assert.equal(meta.visibility, undefined);
  });

  it("rejects invalid visibility", () => {
    assert.throws(
      () =>
        validateSiteContent({
          title: "T",
          visibility: "secret",
          navigation: [],
        }),
      /"visibility" must be one of/
    );
  });

  it("requires navigation array", () => {
    assert.throws(
      () =>
        validateSiteContent({
          title: "T",
        }),
      /"navigation" is required/
    );
  });

  it("rejects bad nav page slug", () => {
    assert.throws(
      () =>
        validateSiteContent({
          title: "T",
          navigation: [{ title: "X", page: "Bad_Slug" }],
        }),
      /page must be "index" or a safe slug/
    );
  });
});
