import fs from "fs";
import path from "path";
import yaml from "yaml";

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
      if (typeof l.title !== "string" || !l.title.trim()) {
        throw new Error(
          prefix(`modules[${mi}].lessons[${li}].title must be a non-empty string`)
        );
      }
      lessons.push({ slug: l.slug.trim(), title: l.title.trim() });
    }

    modules.push({
      slug: m.slug.trim(),
      title: m.title.trim(),
      lessons,
    });
  }

  return { title: o.title.trim(), modules };
}

const CONTENT_ROOT = path.join(process.cwd(), "content", "courses");

export function loadCourse(courseSlug: string): CourseMeta {
  const coursePath = path.join(CONTENT_ROOT, courseSlug, "course.yaml");
  if (!fs.existsSync(coursePath)) {
    throw new Error(`Course not found: ${courseSlug} (missing ${coursePath})`);
  }
  const raw = yaml.parse(fs.readFileSync(coursePath, "utf8"));
  return validateCourseContent(raw);
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
  const filePath = getLessonFilePath(courseSlug, moduleSlug, lessonSlug);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Lesson file missing: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}
