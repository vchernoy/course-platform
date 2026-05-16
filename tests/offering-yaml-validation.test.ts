import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOfferingContent } from "../lib/offerings";

describe("validateOfferingContent", () => {
  const minimalModules = [
    {
      slug: "module-1",
      title: "M",
      lessons: [{ slug: "lesson-1", title: "L" }],
    },
  ];

  it("accepts minimal valid offering", () => {
    const o = validateOfferingContent({
      title: "T",
      format: "course",
      modules: minimalModules,
    });
    assert.equal(o.title, "T");
    assert.equal(o.format, "course");
    assert.equal(o.modules[0]!.slug, "module-1");
  });

  it("accepts optional published and visibility", () => {
    const o = validateOfferingContent({
      title: "T",
      format: "webinar",
      published: true,
      visibility: "unlisted",
      modules: minimalModules,
    });
    assert.equal(o.published, true);
    assert.equal(o.visibility, "unlisted");
  });

  it("rejects invalid format", () => {
    assert.throws(
      () =>
        validateOfferingContent({
          title: "T",
          format: "podcast",
          modules: minimalModules,
        }),
      /"format" must be one of/
    );
  });

  it("rejects invalid visibility", () => {
    assert.throws(
      () =>
        validateOfferingContent({
          title: "T",
          format: "course",
          visibility: "secret",
          modules: minimalModules,
        }),
      /"visibility" must be one of/
    );
  });

  it("rejects non-boolean published", () => {
    assert.throws(
      () =>
        validateOfferingContent({
          title: "T",
          format: "course",
          published: "yes",
          modules: minimalModules,
        }),
      /"published" must be a boolean/
    );
  });

  it("rejects invalid module slug characters", () => {
    assert.throws(
      () =>
        validateOfferingContent({
          title: "T",
          format: "course",
          modules: [
            {
              slug: "module_1",
              title: "M",
              lessons: [{ slug: "lesson-1", title: "L" }],
            },
          ],
        }),
      /modules\[0\]\.slug has invalid format/
    );
  });

  it("rejects invalid lesson slug", () => {
    assert.throws(
      () =>
        validateOfferingContent({
          title: "T",
          format: "course",
          modules: [
            {
              slug: "module-1",
              title: "M",
              lessons: [{ slug: "Lesson 1", title: "L" }],
            },
          ],
        }),
      /lessons\[0\]\.slug has invalid format/
    );
  });

  it("rejects empty modules", () => {
    assert.throws(
      () =>
        validateOfferingContent({
          title: "T",
          format: "course",
          modules: [],
        }),
      /must contain at least one module/
    );
  });
});
