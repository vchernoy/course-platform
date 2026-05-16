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

export type OfferingFormat = "course" | "webinar" | "workshop" | "mini-course";
export type OfferingVisibility = "private" | "public" | "unlisted";

/** Loaded from `offering.yaml`. Same shape used by sidebar / lesson pages (formerly “course”). */
export type OfferingMeta = {
  title: string;
  format: OfferingFormat;
  modules: ModuleMeta[];
  description?: string;
  startDate?: string;
  endDate?: string;
  /** Reserved for future publishing workflows; validated only. */
  published?: boolean;
  /** Reserved for future discovery/access rules; validated only. */
  visibility?: OfferingVisibility;
  /** Path under the offering folder for a cover/thumbnail; validated only (e.g. dashboard cards later). */
  coverImage?: string;
};

/** Alias kept so existing components can import `CourseMeta` without renaming files. */
export type CourseMeta = OfferingMeta;

const CONTENT_ROOT = path.join(process.cwd(), "content", "offerings");

function prefix(msg: string) {
  return `offering.yaml: ${msg}`;
}

const FORMATS = new Set<OfferingFormat>(["course", "webinar", "workshop", "mini-course"]);
const VISIBILITIES = new Set<OfferingVisibility>(["private", "public", "unlisted"]);

/** Validates parsed YAML from `offering.yaml`. */
export function validateOfferingContent(raw: unknown): OfferingMeta {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix(`root must be a mapping (object). Got: ${String(raw)}`));
  }

  const o = raw as Record<string, unknown>;

  if (typeof o.title !== "string" || !o.title.trim()) {
    throw new Error(prefix('"title" is required and must be a non-empty string'));
  }

  if (!("format" in o)) {
    throw new Error(prefix('"format" is required'));
  }
  if (typeof o.format !== "string" || !FORMATS.has(o.format.trim() as OfferingFormat)) {
    throw new Error(
      prefix(`"format" must be one of: course | webinar | workshop | mini-course`)
    );
  }
  const format = o.format.trim() as OfferingFormat;

  if (typeof o.description === "string" && o.description.trim()) {
    /* optional — stored below */
  }
  if ("description" in o && o.description != null && typeof o.description !== "string") {
    throw new Error(prefix('"description" must be a string when set'));
  }

  if ("startDate" in o && o.startDate != null && typeof o.startDate !== "string") {
    throw new Error(prefix('"startDate" must be a string when set'));
  }
  if ("endDate" in o && o.endDate != null && typeof o.endDate !== "string") {
    throw new Error(prefix('"endDate" must be a string when set'));
  }

  if ("published" in o && o.published !== undefined && typeof o.published !== "boolean") {
    throw new Error(prefix('"published" must be a boolean when set'));
  }

  if ("visibility" in o && o.visibility !== undefined) {
    if (
      typeof o.visibility !== "string" ||
      !VISIBILITIES.has(o.visibility.trim() as OfferingVisibility)
    ) {
      throw new Error(prefix(`"visibility" must be one of: private | public | unlisted`));
    }
  }

  if ("coverImage" in o && o.coverImage != null && typeof o.coverImage !== "string") {
    throw new Error(prefix('"coverImage" must be a string when set'));
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

  const out: OfferingMeta = {
    title: o.title.trim(),
    format,
    modules,
  };

  if (typeof o.description === "string" && o.description.trim()) {
    out.description = o.description.trim();
  }
  if (typeof o.startDate === "string" && o.startDate.trim()) {
    out.startDate = o.startDate.trim();
  }
  if (typeof o.endDate === "string" && o.endDate.trim()) {
    out.endDate = o.endDate.trim();
  }
  if (typeof o.published === "boolean") {
    out.published = o.published;
  }
  if (typeof o.visibility === "string" && VISIBILITIES.has(o.visibility.trim() as OfferingVisibility)) {
    out.visibility = o.visibility.trim() as OfferingVisibility;
  }
  if (typeof o.coverImage === "string" && o.coverImage.trim()) {
    out.coverImage = o.coverImage.trim();
  }

  return out;
}

export function loadOffering(offeringSlug: string): OfferingMeta {
  assertSafeSlug("offeringSlug", offeringSlug);
  const offeringPath = path.join(CONTENT_ROOT, offeringSlug, "offering.yaml");
  if (!fs.existsSync(offeringPath)) {
    throw new Error(`Offering not found: ${offeringSlug} (missing ${offeringPath})`);
  }
  const raw = yaml.parse(fs.readFileSync(offeringPath, "utf8"));
  return validateOfferingContent(raw);
}

/** Subfolders of `content/offerings` that contain `offering.yaml`. */
export function listOfferingSlugs(): string[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  const names = fs.readdirSync(CONTENT_ROOT, { withFileTypes: true });
  const slugs: string[] = [];
  for (const d of names) {
    if (!d.isDirectory()) continue;
    const slug = d.name;
    if (!isSafeSlug(slug)) continue;
    const yamlPath = path.join(CONTENT_ROOT, slug, "offering.yaml");
    if (fs.existsSync(yamlPath)) slugs.push(slug);
  }
  slugs.sort();
  return slugs;
}

export type LessonNavItem = {
  moduleSlug: string;
  lessonSlug: string;
  title: string;
};

export function getOrderedLessons(offering: OfferingMeta): LessonNavItem[] {
  const items: LessonNavItem[] = [];
  for (const mod of offering.modules) {
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

export function getLessonNeighbors(
  offering: OfferingMeta,
  lessonSlug: string
): { prev: LessonNavItem | null; next: LessonNavItem | null } {
  const items = getOrderedLessons(offering);
  const idx = items.findIndex((i) => i.lessonSlug === lessonSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? items[idx - 1]! : null,
    next: idx < items.length - 1 ? items[idx + 1]! : null,
  };
}

export function findLessonMeta(
  offering: OfferingMeta,
  lessonSlug: string
): (LessonMeta & { moduleSlug: string }) | null {
  for (const mod of offering.modules) {
    const lesson = mod.lessons.find((l) => l.slug === lessonSlug);
    if (lesson) return { ...lesson, moduleSlug: mod.slug };
  }
  return null;
}

export function getLessonFilePath(
  offeringSlug: string,
  moduleSlug: string,
  lessonSlug: string
): string {
  return path.join(CONTENT_ROOT, offeringSlug, moduleSlug, `${lessonSlug}.mdx`);
}

export function loadLessonSource(
  offeringSlug: string,
  moduleSlug: string,
  lessonSlug: string
): string {
  assertSafeSlug("offeringSlug", offeringSlug);
  assertSafeSlug("moduleSlug", moduleSlug);
  assertSafeSlug("lessonSlug", lessonSlug);
  const filePath = getLessonFilePath(offeringSlug, moduleSlug, lessonSlug);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Lesson file missing: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}
