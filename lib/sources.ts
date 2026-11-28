import fs from "fs";
import path from "path";
import yaml from "yaml";
import { isSafeSlug } from "./slug"; // relative: also loaded by scripts/sync-sources.ts

/**
 * Registry of content sources: `config/sources.yaml` in this repository.
 *
 * A **customer** owns any number of **sources** (repositories or folders). Every source has the same
 * layout, and each part is optional:
 *
 *   config/students.yaml, config/admins.yaml
 *   content/offerings/<slug>/..., content/sites/<slug>/...
 *
 * Everything a customer's sources provide is combined (union). Students and admins only ever apply
 * to offerings and sites of the **same customer**. See docs/content-sources.md.
 */

export type SourceSpec =
  /** This repository (its own `config/` and `content/`). */
  | { id: string; type: "self"; path?: string }
  /** A GitHub repository, cloned before the build into `external-content/<customer>/<id>/`. */
  | { id: string; type: "github"; repo: string; ref?: string; path?: string; tokenEnv?: string }
  /** A folder on disk, relative to this repository (local development, self-hosting, tests). */
  | { id: string; type: "dir"; dir: string; path?: string };

export type CustomerSpec = { id: string; title?: string; sources: SourceSpec[] };

export type SourcesConfig = { customers: CustomerSpec[] };

export const SOURCES_FILE = path.join("config", "sources.yaml");
/** Where GitHub sources are cloned; gitignored. */
export const EXTERNAL_CONTENT_DIR = "external-content";

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REF_RE = /^[A-Za-z0-9_./-]+$/;
const ENV_RE = /^[A-Z][A-Z0-9_]*$/;

function prefix(msg: string) {
  return `sources.yaml: ${msg}`;
}

function optionalString(o: Record<string, unknown>, key: string, where: string): string | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(prefix(`${where}.${key} must be a non-empty string`));
  }
  return v.trim();
}

function safeRelativePath(p: string, where: string): string {
  const norm = path.posix.normalize(p.replace(/\\/g, "/"));
  if (path.posix.isAbsolute(norm) || norm === ".." || norm.startsWith("../")) {
    throw new Error(prefix(`${where} must be a relative path inside the source, got ${JSON.stringify(p)}`));
  }
  return norm === "." ? "" : norm;
}

function defaultSourceId(raw: Record<string, unknown>): string | undefined {
  if (raw.self === true || raw.repo === "self") return "self";
  if (typeof raw.repo === "string") return raw.repo.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (typeof raw.dir === "string") {
    return path.basename(raw.dir.trim()).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
  return undefined;
}

function parseSource(raw: unknown, where: string): SourceSpec {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(prefix(`${where} must be a mapping`));
  }
  const o = raw as Record<string, unknown>;
  const isSelf = o.self === true || o.repo === "self";
  if (!isSelf && typeof o.repo !== "string" && !(typeof o.dir === "string" && o.dir.trim())) {
    throw new Error(prefix(`${where} needs one of: self: true, repo: owner/name, dir: <folder>`));
  }
  const id = optionalString(o, "id", where) ?? defaultSourceId(o);
  if (!id || !isSafeSlug(id)) {
    throw new Error(prefix(`${where}.id must be a lowercase slug (got ${JSON.stringify(id)})`));
  }
  const sub = optionalString(o, "path", where);
  const pathPart = sub !== undefined ? { path: safeRelativePath(sub, `${where}.path`) } : {};

  if (o.self === true || o.repo === "self") {
    return { id, type: "self", ...pathPart };
  }
  if (typeof o.repo === "string") {
    const repo = o.repo.trim();
    if (!REPO_RE.test(repo)) {
      throw new Error(prefix(`${where}.repo must look like owner/name, got ${JSON.stringify(repo)}`));
    }
    const ref = optionalString(o, "ref", where);
    if (ref !== undefined && !REF_RE.test(ref)) {
      throw new Error(prefix(`${where}.ref has unexpected characters: ${JSON.stringify(ref)}`));
    }
    const tokenEnv = optionalString(o, "tokenEnv", where);
    if (tokenEnv !== undefined && !ENV_RE.test(tokenEnv)) {
      throw new Error(
        prefix(`${where}.tokenEnv must be an environment variable NAME like GITHUB_TOKEN_ACME (not the token itself)`)
      );
    }
    return {
      id,
      type: "github",
      repo,
      ...(ref ? { ref } : {}),
      ...pathPart,
      ...(tokenEnv ? { tokenEnv } : {}),
    };
  }
  if (typeof o.dir === "string" && o.dir.trim()) {
    return { id, type: "dir", dir: o.dir.trim(), ...pathPart };
  }
  throw new Error(prefix(`${where} needs one of: self: true, repo: owner/name, dir: <folder>`));
}

export function validateSourcesContent(raw: unknown): SourcesConfig {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(prefix("root must be a mapping"));
  }
  const root = raw as Record<string, unknown>;
  if (!Array.isArray(root.customers) || root.customers.length === 0) {
    throw new Error(prefix('"customers" must be a non-empty list'));
  }

  const customers: CustomerSpec[] = [];
  const customerIds = new Set<string>();
  let selfOwner: string | null = null;

  root.customers.forEach((rawCustomer, ci) => {
    const where = `customers[${ci}]`;
    if (rawCustomer === null || typeof rawCustomer !== "object" || Array.isArray(rawCustomer)) {
      throw new Error(prefix(`${where} must be a mapping`));
    }
    const c = rawCustomer as Record<string, unknown>;
    const id = typeof c.id === "string" ? c.id.trim() : "";
    if (!isSafeSlug(id)) {
      throw new Error(prefix(`${where}.id must be a lowercase slug`));
    }
    if (customerIds.has(id)) {
      throw new Error(prefix(`duplicate customer id "${id}"`));
    }
    customerIds.add(id);
    const title = optionalString(c, "title", where);

    if (!Array.isArray(c.sources) || c.sources.length === 0) {
      throw new Error(prefix(`${where}.sources must be a non-empty list`));
    }
    const sourceIds = new Set<string>();
    const sources = c.sources.map((s, si) => {
      const src = parseSource(s, `${where}.sources[${si}]`);
      if (sourceIds.has(src.id)) {
        throw new Error(prefix(`${where}: duplicate source id "${src.id}" (set a distinct "id")`));
      }
      sourceIds.add(src.id);
      if (src.type === "self") {
        if (selfOwner) {
          throw new Error(prefix(`"self" is listed by both "${selfOwner}" and "${id}"; only one customer may own it`));
        }
        selfOwner = id;
      }
      return src;
    });

    customers.push({ id, ...(title ? { title } : {}), sources });
  });

  return { customers };
}

/** Used when `config/sources.yaml` does not exist: this repository is the only source. */
export const DEFAULT_SOURCES: SourcesConfig = {
  customers: [{ id: "default", sources: [{ id: "self", type: "self" }] }],
};

export function loadSourcesConfig(projectRoot: string = process.cwd()): SourcesConfig {
  const file = path.join(/*turbopackIgnore: true*/ projectRoot, SOURCES_FILE);
  if (!fs.existsSync(file)) return DEFAULT_SOURCES;
  return validateSourcesContent(yaml.parse(fs.readFileSync(file, "utf8")));
}

/** Folder a GitHub source is cloned into. */
export function githubCloneDir(projectRoot: string, customerId: string, sourceId: string): string {
  return path.join(/*turbopackIgnore: true*/ projectRoot, EXTERNAL_CONTENT_DIR, customerId, sourceId);
}

/** Root folder (with `config/` and `content/`) a source provides, whether or not it exists. */
export function sourceRootDir(projectRoot: string, customerId: string, source: SourceSpec): string {
  let base: string;
  if (source.type === "self") base = projectRoot;
  else if (source.type === "github") base = githubCloneDir(projectRoot, customerId, source.id);
  else base = path.resolve(/*turbopackIgnore: true*/ projectRoot, source.dir);
  return source.path ? path.join(/*turbopackIgnore: true*/ base, source.path) : base;
}
