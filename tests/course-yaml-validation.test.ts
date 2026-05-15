import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCourseContent } from "../lib/courses";

describe("validateCourseContent", () => {
  it("accepts minimal valid course", () => {
    const course = validateCourseContent({
      title: "T",
      modules: [
        {
          slug: "module-1",
          title: "M",
          lessons: [{ slug: "lesson-1", title: "L" }],
        },
      ],
    });
    assert.equal(course.title, "T");
    assert.equal(course.modules[0]!.slug, "module-1");
  });

  it("rejects invalid module slug characters", () => {
    assert.throws(
      () =>
        validateCourseContent({
          title: "T",
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
        validateCourseContent({
          title: "T",
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
        validateCourseContent({
          title: "T",
          modules: [],
        }),
      /must contain at least one module/
    );
  });
});
