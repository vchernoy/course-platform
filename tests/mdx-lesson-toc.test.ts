import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractLessonTocItems } from "../lib/mdx-lesson-toc";

describe("extractLessonTocItems", () => {
  it("collects h2 and h3 in order with github-slug ids", async () => {
    const md = [
      "# Page title",
      "",
      "## First section",
      "",
      "### Subpart A",
      "",
      "## Second section",
      "",
    ].join("\n");
    const toc = await extractLessonTocItems(md);
    assert.deepEqual(
      toc.map((x) => ({ depth: x.depth, id: x.id })),
      [
        { depth: 2, id: "first-section" },
        { depth: 3, id: "subpart-a" },
        { depth: 2, id: "second-section" },
      ]
    );
  });

  it("dedupes duplicate heading text like github-slugger", async () => {
    const md = ["", "## Same title", "", "## Same title", ""].join("\n");
    const toc = await extractLessonTocItems(md);
    assert.equal(toc.length, 2);
    assert.equal(toc[0]!.id, "same-title");
    assert.equal(toc[1]!.id, "same-title-1");
  });

  it("handles simple inline math in a heading", async () => {
    const md = "## Growth $x$";
    const toc = await extractLessonTocItems(md);
    assert.equal(toc.length, 1);
    assert.equal(toc[0]!.depth, 2);
    assert.ok(toc[0]!.id.length > 0);
    assert.ok(toc[0]!.text.includes("Growth"));
  });
});
