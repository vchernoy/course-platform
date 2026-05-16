import fs from "fs";
import path from "path";
import yaml from "yaml";
import { isSafeSlug } from "@/lib/slug";

export type StudentEntry = { email: string; offerings: string[] };
export type StudentsConfig = { students: StudentEntry[] };

function prefix(msg: string) {
  return `students.yaml: ${msg}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeOfferingSlugs(
  raw: unknown,
  studentIndex: string,
  arrayLabel: string
): string[] {
  if (!Array.isArray(raw)) {
    throw new Error(prefix(`${studentIndex}.${arrayLabel} must be an array`));
  }
  if (raw.length === 0) {
    throw new Error(prefix(`${studentIndex}.${arrayLabel} must contain at least one slug`));
  }
  const slugs: string[] = [];
  for (let ci = 0; ci < raw.length; ci++) {
    const c = raw[ci];
    if (typeof c !== "string" || !c.trim()) {
      throw new Error(
        prefix(`${studentIndex}.${arrayLabel}[${ci}] must be a non-empty string`)
      );
    }
    const slug = c.trim();
    if (!isSafeSlug(slug)) {
      throw new Error(
        prefix(
          `${studentIndex}.${arrayLabel}[${ci}] invalid offering slug: ${JSON.stringify(slug)}`
        )
      );
    }
    slugs.push(slug);
  }
  return slugs;
}

/** Validates parsed YAML; throws with a clear message if shape is invalid. */
export function validateStudentsContent(raw: unknown): StudentsConfig {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix("root must be a mapping (object)"));
  }
  const o = raw as Record<string, unknown>;

  if (!("students" in o)) {
    throw new Error(prefix('"students" is required'));
  }
  if (!Array.isArray(o.students)) {
    throw new Error(prefix('"students" must be an array'));
  }
  if (o.students.length === 0) {
    throw new Error(prefix('"students" must contain at least one entry'));
  }

  const students: StudentEntry[] = [];
  for (let i = 0; i < o.students.length; i++) {
    const row = o.students[i];
    if (row === null || typeof row !== "object") {
      throw new Error(prefix(`students[${i}] must be an object`));
    }
    const s = row as Record<string, unknown>;
    if (typeof s.email !== "string" || !s.email.trim()) {
      throw new Error(prefix(`students[${i}].email must be a non-empty string`));
    }

    let offerings: string[];
    if ("offerings" in s && s.offerings !== undefined) {
      offerings = normalizeOfferingSlugs(s.offerings, `students[${i}]`, "offerings");
    } else if ("courses" in s && s.courses !== undefined) {
      offerings = normalizeOfferingSlugs(s.courses, `students[${i}]`, "courses");
    } else {
      throw new Error(
        prefix(`students[${i}] must include "offerings" (or legacy "courses")`)
      );
    }

    students.push({ email: s.email.trim(), offerings });
  }

  return { students };
}

const STUDENTS_PATH = path.join(process.cwd(), "config", "students.yaml");

/** Pure allowlist check (used by tests and `emailHasOfferingAccess`). */
export function studentAllowsOffering(
  config: StudentsConfig,
  email: string,
  offeringSlug: string
): boolean {
  const e = normalizeEmail(email);
  const slug = offeringSlug.trim();
  for (const s of config.students) {
    if (normalizeEmail(s.email) !== e) continue;
    return s.offerings.some((x) => x === slug);
  }
  return false;
}

/** @deprecated use studentAllowsOffering */
export const studentAllowsCourse = studentAllowsOffering;

export function loadStudents(): StudentsConfig {
  if (!fs.existsSync(STUDENTS_PATH)) {
    throw new Error(`Missing ${STUDENTS_PATH}`);
  }
  const raw = yaml.parse(fs.readFileSync(STUDENTS_PATH, "utf8"));
  return validateStudentsContent(raw);
}

export function canAccessOfferingWithConfig(
  email: string | undefined,
  offeringSlug: string,
  config: StudentsConfig
): boolean {
  if (!email || !isSafeSlug(offeringSlug)) return false;
  return studentAllowsOffering(config, email, offeringSlug);
}

/** @deprecated use canAccessOfferingWithConfig */
export const canAccessCourseWithConfig = canAccessOfferingWithConfig;

export function emailHasOfferingAccess(email: string, offeringSlug: string): boolean {
  if (!isSafeSlug(offeringSlug)) return false;
  return studentAllowsOffering(loadStudents(), email, offeringSlug);
}

/** @deprecated use emailHasOfferingAccess */
export const emailHasCourseAccess = emailHasOfferingAccess;
