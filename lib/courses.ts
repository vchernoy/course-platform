import fs from "fs";
import path from "path";
import yaml from "yaml";
import { assertSafeSlug, isSafeSlug } from "@/lib/slug";

export type LessonMeta = { slug: string; title: string };
export type ModuleMeta = {
  slug: string;
  title: string;
  lessons: LessonMeta[];
};
export type CourseMeta = { title: string; modules: ModuleMeta[] };

function prefix(msg: string) {
  return `course.yaml: ${msg}`;
}

/** Validates parsed YAML and returns a typed course object; throws Error with a clear message on invalid shape. */
export function validateCourseContent(raw: unknown): CourseMeta {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix('root must be a mapping (object). Got: ' + String(raw)));
  }

  const o = raw as Record<string, unknown>;

  if (typeof o.title !== "string" || !o.title.trim()) {
    throw new Error(prefix('"title" is required and must be a non-empty string'));
  }

  if (!("modules" in o)) {
    throw new Error(prefix('"modules" is required'));
  }

  if (!Array.isArray(o.modules)) {
    throw new Error(prefix('"modules" must be an array'));
  }

  if (o.modules.length === 0) {
    throw new Error(prefix('"modules" must contain at least one module'));
  }

  const modules: ModuleMeta[] = [];

  for (let mi = 0; mi < o.modules.length; mi++) {
    const mod = o.modules[mi];
    if (mod === null || typeof mod !== "object") {
      throw new Error(prefix(`modules[${mi}] must be an object`));
    }
    const m = mod as Record<string, unknown>;

    if (typeof m.slug !== "string" || !m.slug.trim()) {
      throw new Error(prefix(`modules[${mi}].slug must be a non-empty string`));
    }
    const moduleSlug = m.slug.trim();
    if (!isSafeSlug(moduleSlug)) {
      throw new Error(prefix(`modules[${mi}].slug has invalid format: ${JSON.stringify(moduleSlug)}`));
    }
    if (typeof m.title !== "string" || !m.title.trim()) {
      throw new Error(prefix(`modules[${mi}].title must be a non-empty string`));
    }
    if (!("lessons" in m)) {
      throw new Error(prefix(`modules[${mi}] is missing "lessons"`));
    }
    if (!Array.isArray(m.lessons)) {
      throw new Error(prefix(`modules[${mi}].lessons must be an array`));
    }
    if (m.lessons.length === 0) {
      throw new Error(prefix(`modules[${mi}].lessons must contain at least one lesson`));
    }

    const lessons: LessonMeta[] = [];
    for (let li = 0; li < m.lessons.length; li++) {
      const les = m.lessons[li];
      if (les === null || typeof les !== "object") {
        throw new Error(prefix(`modules[${mi}].lessons[${li}] must be an object`));
      }
      const l = les as Record<string, unknown>;
      if (typeof l.slug !== "string" || !l.slug.trim()) {
        throw new Error(
          prefix(`modules[${mi}].lessons[${li}].slug must be a non-empty string`)
        );
      }
      const lessonSlug = l.slug.trim();
      if (!isSafeSlug(lessonSlug)) {
        throw new Error(
          prefix(
            `modules[${mi}].lessons[${li}].slug has invalid format: ${JSON.stringify(lessonSlug)}`
          )
        );
      }
      if (typeof l.title !== "string" || !l.title.trim()) {
        throw new Error(
          prefix(`modules[${mi}].lessons[${li}].title must be a non-empty string`)
        );
      }
      lessons.push({ slug: lessonSlug, title: l.title.trim() });
    }

    modules.push({
      slug: moduleSlug,
      title: m.title.trim(),
      lessons,
    });
  }

  return { title: o.title.trim(), modules };
}

const CONTENT_ROOT = path.join(process.cwd(), "content", "courses");

export function loadCourse(courseSlug: string): CourseMeta {
  assertSafeSlug("courseSlug", courseSlug);
  const coursePath = path.join(CONTENT_ROOT, courseSlug, "course.yaml");
  if (!fs.existsSync(coursePath)) {
    throw new Error(`Course not found: ${courseSlug} (missing ${coursePath})`);
  }
  const raw = yaml.parse(fs.readFileSync(coursePath, "utf8"));
  return validateCourseContent(raw);
}

export type LessonNavItem = {
  moduleSlug: string;
  lessonSlug: string;
  title: string;
};

/** Flatten modules → lessons in YAML order (used for nav and prev/next). */
export function getOrderedLessons(course: CourseMeta): LessonNavItem[] {
  const items: LessonNavItem[] = [];
  for (const mod of course.modules) {
    for (const les of mod.lessons) {
      items.push({
        moduleSlug: mod.slug,
        lessonSlug: les.slug,
        title: les.title,
      });
    }
  }
  return items;
}

/** Adjacent lessons in course order. Lesson slugs should be unique per course. */
export function getLessonNeighbors(
  course: CourseMeta,
  lessonSlug: string
): { prev: LessonNavItem | null; next: LessonNavItem | null } {
  const items = getOrderedLessons(course);
  const idx = items.findIndex((i) => i.lessonSlug === lessonSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? items[idx - 1]! : null,
    next: idx < items.length - 1 ? items[idx + 1]! : null,
  };
}

export function findLessonMeta(course: CourseMeta, lessonSlug: string): LessonMeta & { moduleSlug: string } | null {
  for (const mod of course.modules) {
    const lesson = mod.lessons.find((l) => l.slug === lessonSlug);
    if (lesson) return { ...lesson, moduleSlug: mod.slug };
  }
  return null;
}

export function getLessonFilePath(courseSlug: string, moduleSlug: string, lessonSlug: string): string {
  return path.join(CONTENT_ROOT, courseSlug, moduleSlug, `${lessonSlug}.mdx`);
}

export function loadLessonSource(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string
): string {
  assertSafeSlug("courseSlug", courseSlug);
  assertSafeSlug("moduleSlug", moduleSlug);
  assertSafeSlug("lessonSlug", lessonSlug);
  const filePath = getLessonFilePath(courseSlug, moduleSlug, lessonSlug);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Lesson file missing: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}
