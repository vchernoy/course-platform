import fs from "fs";
import path from "path";
import yaml from "yaml";
import { isSafeSlug } from "@/lib/slug";
import { normalizeEmail } from "@/lib/students";

export type AdminRole = "owner" | "editor" | "viewer";

export type AdminEntry = {
  email: string;
  role: AdminRole;
  /** Explicit slugs when `allOfferings` is false (no "*" row). */
  offeringSlugs: string[];
  /** True when config listed "*" as the only offerings pattern. */
  allOfferings: boolean;
  /** Explicit site slugs when `allSites` is false; omitted in YAML → no site access. */
  siteSlugs: string[];
  /** True when config listed "*" as the only `sites` pattern. */
  allSites: boolean;
};

export type AdminsConfig = { admins: AdminEntry[] };

/** Resolved access for an admin row (after load/validation). */
export type AdminAccess = {
  role: AdminRole;
  allOfferings: boolean;
  offeringSlugs: string[];
  allSites: boolean;
  siteSlugs: string[];
};

function prefix(msg: string) {
  return `admins.yaml: ${msg}`;
}

const ROLES = new Set<AdminRole>(["owner", "editor", "viewer"]);

function parseOfferingsField(raw: unknown, adminIndex: string): Pick<AdminEntry, "offeringSlugs" | "allOfferings"> {
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
): Pick<AdminEntry, "siteSlugs" | "allSites"> {
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

    if (typeof r.role !== "string" || !ROLES.has(r.role.trim() as AdminRole)) {
      throw new Error(
        prefix(`${adminIndex}.role must be one of: owner | editor | viewer`)
      );
    }
    const role = r.role.trim() as AdminRole;

    if (!("offerings" in r)) {
      throw new Error(prefix(`${adminIndex} is missing "offerings"`));
    }

    const { allOfferings, offeringSlugs } = parseOfferingsField(r.offerings, adminIndex);

    const { allSites, siteSlugs } = parseSitesField(
      "sites" in r ? r.sites ?? undefined : undefined,
      adminIndex
    );

    admins.push({
      email: r.email.trim(),
      role,
      offeringSlugs,
      allOfferings,
      siteSlugs,
      allSites,
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
      role: row.role,
      allOfferings: row.allOfferings,
      offeringSlugs: row.offeringSlugs,
      allSites: row.allSites,
      siteSlugs: row.siteSlugs,
    };
  }
  return null;
}

export function emailIsAdminFromConfig(config: AdminsConfig, email: string | undefined): boolean {
  return getAdminAccessFromConfig(config, email) !== null;
}

export function canAdminAccessOfferingFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  offeringSlug: string
): boolean {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return false;
  if (!isSafeSlug(offeringSlug)) return false;
  if (access.allOfferings) return true;
  return access.offeringSlugs.includes(offeringSlug);
}

/** Filters `allOfferingSlugs` to those this admin may manage (preserves input order, dedupes by walk). */
export function listAdminAllowedOfferingSlugsFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  allOfferingSlugs: readonly string[]
): string[] {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return [];
  if (access.allOfferings) {
    return allOfferingSlugs.filter((s) => isSafeSlug(s));
  }
  const allowed = new Set(access.offeringSlugs);
  return allOfferingSlugs.filter((s) => allowed.has(s));
}

export function canAdminAccessSiteFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  siteSlug: string
): boolean {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return false;
  if (!isSafeSlug(siteSlug)) return false;
  if (access.allSites) return true;
  return access.siteSlugs.includes(siteSlug);
}

/** Filters `allSiteSlugs` to those this admin may manage (preserves input order). */
export function listAdminAllowedSiteSlugsFromConfig(
  config: AdminsConfig,
  email: string | undefined,
  allSiteSlugs: readonly string[]
): string[] {
  const access = getAdminAccessFromConfig(config, email);
  if (!access) return [];
  if (access.allSites) {
    return allSiteSlugs.filter((s) => isSafeSlug(s));
  }
  const allowed = new Set(access.siteSlugs);
  return allSiteSlugs.filter((s) => allowed.has(s));
}
