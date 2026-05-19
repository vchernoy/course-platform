import { describe, expect, it } from "vitest";
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
    expect(toc.map((x) => ({ depth: x.depth, id: x.id }))).toEqual([
      { depth: 2, id: "first-section" },
      { depth: 3, id: "subpart-a" },
      { depth: 2, id: "second-section" },
    ]);
  });

  it("dedupes duplicate heading text like github-slugger", async () => {
    const md = ["", "## Same title", "", "## Same title", ""].join("\n");
    const toc = await extractLessonTocItems(md);
    expect(toc).toHaveLength(2);
    expect(toc[0]!.id).toBe("same-title");
    expect(toc[1]!.id).toBe("same-title-1");
  });

  it("handles simple inline math in a heading", async () => {
    const md = "## Growth $x$";
    const toc = await extractLessonTocItems(md);
    expect(toc).toHaveLength(1);
    expect(toc[0]!.depth).toBe(2);
    expect(toc[0]!.id.length).toBeGreaterThan(0);
    expect(toc[0]!.text).toContain("Growth");
  });
});
