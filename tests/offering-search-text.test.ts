import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMarkdownHeadingsOutsideFences,
  stripLessonMdxForSearchBody,
} from "../lib/offering-search-text";

describe("offering-search-text", () => {
  it("stripLessonMdxForSearchBody removes fence lines but keeps inner code", () => {
    const src = ["Intro.", "```ts", "const rocket = () => 1;", "```", "Outro."].join("\n");
    const body = stripLessonMdxForSearchBody(src);
    assert.match(body, /Intro\.?.*Outro/i);
    assert.match(body, /const rocket/);
    assert.doesNotMatch(body, /```/);
  });

  it("extractMarkdownHeadingsOutsideFences skips headings inside fences", () => {
    const src = [
      "## Real heading",
      "```",
      "## Fake heading",
      "```",
      "### Another real",
    ].join("\n");
    const hs = extractMarkdownHeadingsOutsideFences(src);
    assert.deepEqual(hs, ["Real heading", "Another real"]);
  });

  it("stripLessonMdxForSearchBody unwraps markdown links and strips JSX outside fences", () => {
    const src = "See [the lesson](lesson:foo) and <FooBar /> end.";
    const body = stripLessonMdxForSearchBody(src);
    assert.match(body, /See the lesson and\s+end/i);
    assert.doesNotMatch(body, /FooBar/);
  });

  it("stripLessonMdxForSearchBody drops import lines outside fences", () => {
    const src = ['import { X } from "y"', "Hello [world](https://w.example)."].join("\n");
    const body = stripLessonMdxForSearchBody(src);
    assert.match(body, /Hello world/i);
    assert.doesNotMatch(body, /import/);
  });

  it("stripLessonMdxForSearchBody keeps directive bodies when stripping ::: lines", () => {
    const src = [":::note Title", "Inside directive", ":::", "After."].join("\n");
    const body = stripLessonMdxForSearchBody(src);
    assert.match(body, /Inside directive/);
    assert.match(body, /After/);
    assert.doesNotMatch(body, /:::note/);
  });
});
