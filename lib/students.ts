import fs from "fs";
import yaml from "yaml";
import { customerConfigFiles, customerOfOffering } from "@/lib/content-roots";
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

/** Merge several students files: one row per email, offerings unioned (first-seen order). */
export function mergeStudentsConfigs(configs: readonly StudentsConfig[]): StudentsConfig {
  const byEmail = new Map<string, StudentEntry>();
  for (const config of configs) {
    for (const row of config.students) {
      const key = normalizeEmail(row.email);
      const prev = byEmail.get(key);
      if (!prev) {
        byEmail.set(key, { email: row.email, offerings: [...row.offerings] });
      } else {
        for (const slug of row.offerings) {
          if (!prev.offerings.includes(slug)) prev.offerings.push(slug);
        }
      }
    }
  }
  return { students: [...byEmail.values()] };
}

function readStudentsFile(file: string): StudentsConfig {
  try {
    return validateStudentsContent(yaml.parse(fs.readFileSync(file, "utf8")));
  } catch (e) {
    throw new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** All `config/students.yaml` files of one customer's sources, merged. */
export function loadStudentsForCustomer(customer: string): StudentsConfig {
  return mergeStudentsConfigs(customerConfigFiles(customer, "students.yaml").map(readStudentsFile));
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

/**
 * Whether `email` is enrolled in `offeringSlug`. Only students files from the same customer as the
 * offering count, so one customer's lists can never grant access to another customer's courses.
 */
export function emailHasOfferingAccess(email: string, offeringSlug: string): boolean {
  if (!isSafeSlug(offeringSlug)) return false;
  const customer = customerOfOffering(offeringSlug);
  if (!customer) return false;
  return studentAllowsOffering(loadStudentsForCustomer(customer), email, offeringSlug);
}

/** @deprecated use emailHasOfferingAccess */
export const emailHasCourseAccess = emailHasOfferingAccess;
