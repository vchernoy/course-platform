import fs from "fs";
import path from "path";
import yaml from "yaml";
import { isSafeSlug } from "@/lib/slug";
import { normalizeEmail } from "@/lib/students";

export type AdminRole = "owner" | "editor" | "viewer";

/** Scopes authored in YAML under `assignments[].scope`. */
export type YamlAdminScope =
  | { type: "platform" }
  | { type: "offering"; slug: string }
  | { type: "site"; slug: string };

/**
 * Parsed scope after validation. Includes legacy-only rows used only when normalizing
 * `offerings` / `sites` with `"*"` (independent wildcard axes).
 */
export type AdminAssignmentScope =
  | YamlAdminScope
  | { type: "wildcard_offerings" }
  | { type: "wildcard_sites" };

export type AdminAssignment = {
  role: AdminRole;
  scope: AdminAssignmentScope;
};

export type AdminEntry = {
  email: string;
  assignments: readonly AdminAssignment[];
};

export type AdminsConfig = { admins: AdminEntry[] };

/** Resolved access for an admin row (normalized assignments plus merged role). */
export type AdminAccess = {
  role: AdminRole;
  assignments: readonly AdminAssignment[];
};

function prefix(msg: string) {
  return `admins.yaml: ${msg}`;
}

const ROLES = new Set<AdminRole>(["owner", "editor", "viewer"]);

const ROLE_PRECEDENCE: Record<AdminRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

function mergeMaxRole(assignments: readonly AdminAssignment[]): AdminRole {
  let max: AdminRole = "viewer";
  for (const a of assignments) {
    if (ROLE_PRECEDENCE[a.role] > ROLE_PRECEDENCE[max]) {
      max = a.role;
    }
  }
  return max;
}

function assignmentsGrantAllOfferings(assignments: readonly AdminAssignment[]): boolean {
  return assignments.some(
    (a) =>
      a.scope.type === "platform" ||
      a.scope.type === "wildcard_offerings"
  );
}

function assignmentsGrantAllSites(assignments: readonly AdminAssignment[]): boolean {
  return assignments.some(
    (a) => a.scope.type === "platform" || a.scope.type === "wildcard_sites"
  );
}

function explicitOfferingSlugs(assignments: readonly AdminAssignment[]): string[] {
  const out: string[] = [];
  for (const a of assignments) {
    if (a.scope.type === "offering") out.push(a.scope.slug);
  }
  return [...new Set(out)];
}

function explicitSiteSlugs(assignments: readonly AdminAssignment[]): string[] {
  const out: string[] = [];
  for (const a of assignments) {
    if (a.scope.type === "site") out.push(a.scope.slug);
  }
  return [...new Set(out)];
}

function parseOfferingsField(
  raw: unknown,
  adminIndex: string
): { offeringSlugs: string[]; allOfferings: boolean } {
  if (!Array.isArray(raw)) {
    throw new Error(prefix(`${adminIndex}.offerings must be an array`));
  }
  if (raw.length === 0) {
    throw new Error(prefix(`${adminIndex}.offerings must be non-empty`));
  }

  const explicit: string[] = [];
  let star = false;

  for (let i = 0; i < raw.length; i++) {
    const cell = raw[i];
    if (typeof cell !== "string" || !cell.trim()) {
      throw new Error(prefix(`${adminIndex}.offerings[${i}] must be a non-empty string`));
    }
    const token = cell.trim();
    if (token === "*") {
      star = true;
      continue;
    }
    if (!isSafeSlug(token)) {
      throw new Error(
        prefix(
          `${adminIndex}.offerings[${i}] must be "*" or a valid offering slug, got ${JSON.stringify(token)}`
        )
      );
    }
    explicit.push(token);
  }

  if (star && explicit.length > 0) {
    throw new Error(prefix(`${adminIndex}.offerings cannot mix "*" with specific offering slugs`));
  }

  if (star) {
    return { allOfferings: true, offeringSlugs: [] };
  }

  return { allOfferings: false, offeringSlugs: [...new Set(explicit)] };
}

function parseSitesField(
  raw: unknown,
  adminIndex: string
): { siteSlugs: string[]; allSites: boolean } {
  if (raw === undefined || raw === null) {
    return { allSites: false, siteSlugs: [] };
  }
  if (!Array.isArray(raw)) {
    throw new Error(prefix(`${adminIndex}.sites must be an array`));
  }
  if (raw.length === 0) {
    throw new Error(prefix(`${adminIndex}.sites must be non-empty when set`));
  }

  const explicit: string[] = [];
  let star = false;

  for (let i = 0; i < raw.length; i++) {
    const cell = raw[i];
    if (typeof cell !== "string" || !cell.trim()) {
      throw new Error(prefix(`${adminIndex}.sites[${i}] must be a non-empty string`));
    }
    const token = cell.trim();
    if (token === "*") {
      star = true;
      continue;
    }
    if (!isSafeSlug(token)) {
      throw new Error(
        prefix(
          `${adminIndex}.sites[${i}] must be "*" or a valid site slug, got ${JSON.stringify(token)}`
        )
      );
    }
    explicit.push(token);
  }

  if (star && explicit.length > 0) {
    throw new Error(prefix(`${adminIndex}.sites cannot mix "*" with specific site slugs`));
  }

  if (star) {
    return { allSites: true, siteSlugs: [] };
  }

  return { allSites: false, siteSlugs: [...new Set(explicit)] };
}

function normalizeLegacyAssignments(
  role: AdminRole,
  allOfferings: boolean,
  offeringSlugs: string[],
  allSites: boolean,
  siteSlugs: string[]
): AdminAssignment[] {
  const out: AdminAssignment[] = [];
  if (allOfferings) {
    out.push({ role, scope: { type: "wildcard_offerings" } });
  } else {
    for (const slug of offeringSlugs) {
      out.push({ role, scope: { type: "offering", slug } });
    }
  }
  if (allSites) {
    out.push({ role, scope: { type: "wildcard_sites" } });
  } else {
    for (const slug of siteSlugs) {
      out.push({ role, scope: { type: "site", slug } });
    }
  }
  return out;
}

function parseYamlScope(
  raw: unknown,
  adminIndex: string,
  assignmentIndex: string
): YamlAdminScope {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix(`${adminIndex}.${assignmentIndex}.scope must be an object`));
  }
  const o = raw as Record<string, unknown>;
  const tRaw = o.type;
  if (typeof tRaw !== "string" || !tRaw.trim()) {
    throw new Error(prefix(`${adminIndex}.${assignmentIndex}.scope.type must be non-empty string`));
  }
  const t = tRaw.trim();
  if (t === "platform") {
    if ("slug" in o && o.slug !== undefined && o.slug !== null && String(o.slug).trim() !== "") {
      throw new Error(
        prefix(`${adminIndex}.${assignmentIndex}.scope.slug must not be set when type is platform`)
      );
    }
    return { type: "platform" };
  }
  if (t === "offering") {
    if (typeof o.slug !== "string" || !o.slug.trim()) {
      throw new Error(
        prefix(`${adminIndex}.${assignmentIndex}.scope.slug is required when type is offering`)
      );
    }
    const slug = o.slug.trim();
    if (!isSafeSlug(slug)) {
      throw new Error(
        prefix(
          `${adminIndex}.${assignmentIndex}.scope.slug must be a valid offering slug, got ${JSON.stringify(slug)}`
        )
      );
    }
    return { type: "offering", slug };
  }
  if (t === "site") {
    if (typeof o.slug !== "string" || !o.slug.trim()) {
      throw new Error(
        prefix(`${adminIndex}.${assignmentIndex}.scope.slug is required when type is site`)
      );
    }
    const slug = o.slug.trim();
    if (!isSafeSlug(slug)) {
      throw new Error(
        prefix(
          `${adminIndex}.${assignmentIndex}.scope.slug must be a valid site slug, got ${JSON.stringify(slug)}`
        )
      );
    }
    return { type: "site", slug };
  }
  throw new Error(
    prefix(
      `${adminIndex}.${assignmentIndex}.scope.type must be platform | offering | site, got ${JSON.stringify(t)}`
    )
  );
}

function parseAssignmentsField(
  raw: unknown,
  adminIndex: string
): AdminAssignment[] {
  if (!Array.isArray(raw)) {
    throw new Error(prefix(`${adminIndex}.assignments must be an array`));
  }
  if (raw.length === 0) {
    throw new Error(prefix(`${adminIndex}.assignments must be non-empty`));
  }

  const out: AdminAssignment[] = [];
  for (let j = 0; j < raw.length; j++) {
    const assignmentIndex = `assignments[${j}]`;
    const cell = raw[j];
    if (cell === null || typeof cell !== "object") {
      throw new Error(prefix(`${adminIndex}.${assignmentIndex} must be an object`));
    }
    const a = cell as Record<string, unknown>;
    const roleRaw = a.role;
    if (typeof roleRaw !== "string" || !ROLES.has(roleRaw.trim() as AdminRole)) {
      throw new Error(
        prefix(`${adminIndex}.${assignmentIndex}.role must be one of: owner | editor | viewer`)
      );
    }
    const role = roleRaw.trim() as AdminRole;
    if (!("scope" in a)) {
      throw new Error(prefix(`${adminIndex}.${assignmentIndex} is missing "scope"`));
    }
    const scope = parseYamlScope(a.scope, adminIndex, assignmentIndex);
    out.push({ role, scope });
  }
  return out;
}

/** Validates parsed YAML; throws with a clear message if shape is invalid. */
export function validateAdminsContent(raw: unknown): AdminsConfig {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix("root must be a mapping (object)"));
  }

  const o = raw as Record<string, unknown>;

  if (!("admins" in o)) {
    throw new Error(prefix('"admins" is required'));
  }
  if (!Array.isArray(o.admins)) {
    throw new Error(prefix('"admins" must be an array'));
  }
  if (o.admins.length === 0) {
    throw new Error(prefix('"admins" must contain at least one entry'));
  }

  const seenEmails = new Set<string>();
  const admins: AdminEntry[] = [];

  for (let i = 0; i < o.admins.length; i++) {
    const row = o.admins[i];
    const adminIndex = `admins[${i}]`;

    if (row === null || typeof row !== "object") {
      throw new Error(prefix(`${adminIndex} must be an object`));
    }

    const r = row as Record<string, unknown>;

    if (typeof r.email !== "string" || !r.email.trim()) {
      throw new Error(prefix(`${adminIndex}.email must be a non-empty string`));
    }

    const emailNorm = normalizeEmail(r.email);
    if (seenEmails.has(emailNorm)) {
      throw new Error(prefix(`duplicate admin email: ${JSON.stringify(emailNorm)}`));
    }
    seenEmails.add(emailNorm);

    const hasAssignmentsArray = Array.isArray(r.assignments);

    if ("assignments" in r || hasAssignmentsArray) {
      if (!hasAssignmentsArray) {
        throw new Error(prefix(`${adminIndex}.assignments must be an array`));
      }
      if ("role" in r || "offerings" in r || "sites" in r) {
        throw new Error(
          prefix(
            `${adminIndex}: use either legacy fields (role, offerings, optional sites) or assignments, not both`
          )
        );
      }
      const assignments = parseAssignmentsField(r.assignments, adminIndex);
      admins.push({
        email: r.email.trim(),
        assignments,
      });
      continue;
    }

    /* Legacy schema */
    if (typeof r.role !== "string" || !ROLES.has(r.role.trim() as AdminRole)) {
      throw new Error(prefix(`${adminIndex}.role must be one of: owner | editor | viewer`));
    }
    const role = r.role.trim() as AdminRole;

    if (!("offerings" in r)) {
      throw new Error(prefix(`${adminIndex} is missing "offerings"`));
    }

    const { allOfferings, offeringSlugs } = parseOfferingsField(r.offerings, adminIndex);

    const { allSites, siteSlugs } = parseSitesField(
      "sites" in r ? (r.sites ?? undefined) : undefined,
      adminIndex
    );

    admins.push({
      email: r.email.trim(),
      assignments: normalizeLegacyAssignments(
        role,
        allOfferings,
        offeringSlugs,
        allSites,
        siteSlugs
      ),
    });
  }

  return { admins };
}

const ADMINS_PATH = path.join(process.cwd(), "config", "admins.yaml");

export function loadAdmins(): AdminsConfig {
  if (!fs.existsSync(ADMINS_PATH)) {
    throw new Error(`Missing ${ADMINS_PATH}`);
  }
  const raw = yaml.parse(fs.readFileSync(ADMINS_PATH, "utf8"));
  return validateAdminsContent(raw);
}

export function getAdminAccessFromConfig(
  config: AdminsConfig,
  email: string | undefined
): AdminAccess | null {
  if (!email) return null;
  const e = normalizeEmail(email);
  for (const row of config.admins) {
    if (normalizeEmail(row.email) !== e) continue;
    return {
      role: mergeMaxRole(row.assignments),
      assignments: row.assignments,
    };
  }
  return null;
}

export function emailIsAdminFromConfig(config: AdminsConfig, email: string | undefined): boolean {
  return getAdminAccessFromConfig(config, email) !== null;
}

function canGrantOffering(assignments: readonly AdminAssignment[], offeringSlug: string): boolean {
  if (!isSafeSlug(offeringSlug)) return false;
  for (const a of assignments) {
    const s = a.scope;
    if (s.type === "platform" || s.type === "wildcard_offerings") return true;
    if (s.type === "offering" && s.slug === offeringSlug) return true;
  }
  return false;
}

/** True if this single assignment grants admin UI access to `siteSlug` (any role). */
export function assignmentGrantsSiteSlug(a: AdminAssignment, siteSlug: string): boolean {
  if (!isSafeSlug(siteSlug)) return false;
  const s = a.scope;
  if (s.type === "platform" || s.type === "wildcard_sites") return true;
  if (s.type === "site" && s.slug === siteSlug) return true;
  return false;
}

function canGrantSite(assignments: readonly AdminAssignment[], siteSlug: string): boolean {
  if (!isSafeSlug(siteSlug)) return false;
  for (const a of assignments) {
    if (assignmentGrantsSiteSlug(a, siteSlug)) return true;
  }
  return false;
}

/**
 * Create/delete published site pages (filesystem `content/sites`) may run only when some
 * assignment grants this site/platWildcard AND that assignment's role is owner or editor.
 * Viewer assignments that grant the site do not allow mutation.
 */
export function canAdminMutateSiteFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  siteSlug: string
): boolean {
  const access = getAdminAccessFromConfig(config, email);
  if (!access || !isSafeSlug(siteSlug)) return false;
  for (const a of access.assignments) {
    if (a.role !== "owner" && a.role !== "editor") continue;
    if (assignmentGrantsSiteSlug(a, siteSlug)) return true;
  }
  return false;
}

export function canAdminAccessOfferingFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  offeringSlug: string
): boolean {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return false;
  return canGrantOffering(access.assignments, offeringSlug);
}

/** Filters `allOfferingSlugs` to those this admin may manage (preserves input order, dedupes by walk). */
export function listAdminAllowedOfferingSlugsFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  allOfferingSlugs: readonly string[]
): string[] {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return [];
  if (assignmentsGrantAllOfferings(access.assignments)) {
    return allOfferingSlugs.filter((s) => isSafeSlug(s));
  }
  const allowed = new Set(explicitOfferingSlugs(access.assignments));
  return allOfferingSlugs.filter((s) => allowed.has(s));
}

export function canAdminAccessSiteFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  siteSlug: string
): boolean {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return false;
  return canGrantSite(access.assignments, siteSlug);
}

/** Filters `allSiteSlugs` to those this admin may manage (preserves input order). */
export function listAdminAllowedSiteSlugsFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  allSiteSlugs: readonly string[]
): string[] {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return [];
  if (assignmentsGrantAllSites(access.assignments)) {
    return allSiteSlugs.filter((s) => isSafeSlug(s));
  }
  const allowed = new Set(explicitSiteSlugs(access.assignments));
  return allSiteSlugs.filter((s) => allowed.has(s));
}
