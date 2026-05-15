import fs from "fs";
import path from "path";
import yaml from "yaml";

export type StudentEntry = { email: string; courses: string[] };
export type StudentsConfig = { students: StudentEntry[] };

function prefix(msg: string) {
  return `students.yaml: ${msg}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    if (!("courses" in s)) {
      throw new Error(prefix(`students[${i}] is missing "courses"`));
    }
    if (!Array.isArray(s.courses)) {
      throw new Error(prefix(`students[${i}].courses must be an array`));
    }
    if (s.courses.length === 0) {
      throw new Error(prefix(`students[${i}].courses must contain at least one course slug`));
    }
    const courses: string[] = [];
    for (let ci = 0; ci < s.courses.length; ci++) {
      const c = s.courses[ci];
      if (typeof c !== "string" || !c.trim()) {
        throw new Error(
          prefix(`students[${i}].courses[${ci}] must be a non-empty string`)
        );
      }
      courses.push(c.trim());
    }
    students.push({ email: s.email.trim(), courses });
  }

  return { students };
}

const STUDENTS_PATH = path.join(process.cwd(), "config", "students.yaml");

export function loadStudents(): StudentsConfig {
  if (!fs.existsSync(STUDENTS_PATH)) {
    throw new Error(`Missing ${STUDENTS_PATH}`);
  }
  const raw = yaml.parse(fs.readFileSync(STUDENTS_PATH, "utf8"));
  return validateStudentsContent(raw);
}

/** Server-only allowlist check (reads students.yaml). */
export function emailHasCourseAccess(email: string, courseSlug: string): boolean {
  const { students } = loadStudents();
  const e = normalizeEmail(email);
  const slug = courseSlug.trim();
  for (const s of students) {
    if (normalizeEmail(s.email) !== e) continue;
    return s.courses.some((c) => c === slug);
  }
  return false;
}
