import fs from "fs";
import path from "path";
import { isSafeSlug } from "@/lib/slug";
import { loadSourcesConfig, sourceRootDir, type SourceSpec } from "@/lib/sources";

/**
 * Content roots come from `config/sources.yaml` (see lib/sources.ts and docs/content-sources.md).
 * Each root belongs to one customer and has the same layout:
 *
 *   <root>/config/students.yaml, <root>/config/admins.yaml
 *   <root>/content/offerings/<slug>/offering.yaml ...
 *   <root>/content/sites/<slug>/site.yaml ...
 *
 * Everything is combined (union). Offering and site slugs are global (they appear in URLs), so the
 * same slug in two roots is an error. Students and admins files apply only to their own customer.
 */

export type ContentRoot = {
  customer: string;
  sourceId: string;
  sourceType: SourceSpec["type"];
  dir: string;
};

export type ContentCollection = "offerings" | "sites";

export type CollectionItem = { slug: string; customer: string; root: ContentRoot; dir: string };

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

const warnedMissing = new Set<string>();

/** Every configured source root that exists on disk, in `sources.yaml` order. */
export function contentRoots(): ContentRoot[] {
  const projectRoot = process.cwd();
  const roots: ContentRoot[] = [];
  for (const customer of loadSourcesConfig(projectRoot).customers) {
    for (const source of customer.sources) {
      const dir = sourceRootDir(projectRoot, customer.id, source);
      if (!isDirectory(dir)) {
        // Normal in local dev for private repos you have no token for; the build enforces it on Vercel.
        const key = `${customer.id}/${source.id}`;
        if (!warnedMissing.has(key)) {
          warnedMissing.add(key);
          console.warn(`[content-sources] ${key}: ${dir} not found; skipping (run npm run sync:sources).`);
        }
        continue;
      }
      roots.push({ customer: customer.id, sourceId: source.id, sourceType: source.type, dir });
    }
  }
  return roots;
}

/** Customer ids from `config/sources.yaml`. */
export function listCustomerIds(): string[] {
  return loadSourcesConfig(process.cwd()).customers.map((c) => c.id);
}

function collectionDir(root: ContentRoot, collection: ContentCollection): string {
  return path.join(/*turbopackIgnore: true*/ root.dir, "content", collection);
}

/** File that marks a folder as an item of the collection. */
function markerFile(collection: ContentCollection): string {
  return collection === "offerings" ? "offering.yaml" : "site.yaml";
}

function scanCollection(collection: ContentCollection): Map<string, CollectionItem> {
  const found = new Map<string, CollectionItem>();
  for (const root of contentRoots()) {
    const base = collectionDir(root, collection);
    if (!isDirectory(base)) continue;
    for (const d of fs.readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory() || !isSafeSlug(d.name)) continue;
      const dir = path.join(/*turbopackIgnore: true*/ base, d.name);
      if (!fs.existsSync(path.join(/*turbopackIgnore: true*/ dir, markerFile(collection)))) continue;
      const prev = found.get(d.name);
      if (prev) {
        throw new Error(
          `Duplicate ${collection} slug "${d.name}" in sources ${prev.customer}/${prev.root.sourceId} and ` +
            `${root.customer}/${root.sourceId}. Slugs are part of URLs and must be unique; rename one.`
        );
      }
      found.set(d.name, { slug: d.name, customer: root.customer, root, dir });
    }
  }
  return found;
}

/** Sorted slugs of all offerings or sites across sources (optionally one customer's). */
export function listCollectionSlugs(collection: ContentCollection, customer?: string): string[] {
  const items = [...scanCollection(collection).values()];
  return items
    .filter((i) => customer === undefined || i.customer === customer)
    .map((i) => i.slug)
    .sort();
}

/**
 * The source that holds an offering or site, or null if none does. Throws when two sources have
 * the slug, so a direct URL can never silently pick one source (and its customer's permissions).
 */
export function findCollectionItem(collection: ContentCollection, slug: string): CollectionItem | null {
  if (!isSafeSlug(slug)) return null;
  const matches: CollectionItem[] = [];
  for (const root of contentRoots()) {
    const dir = path.join(/*turbopackIgnore: true*/ collectionDir(root, collection), slug);
    if (fs.existsSync(path.join(/*turbopackIgnore: true*/ dir, markerFile(collection)))) {
      matches.push({ slug, customer: root.customer, root, dir });
    }
  }
  if (matches.length > 1) {
    const [a, b] = matches as [CollectionItem, CollectionItem];
    throw new Error(
      `Duplicate ${collection} slug "${slug}" in sources ${a.customer}/${a.root.sourceId} and ` +
        `${b.customer}/${b.root.sourceId}. Slugs are part of URLs and must be unique; rename one.`
    );
  }
  return matches[0] ?? null;
}

/** Folder of an offering, or null when no configured source has it (no fallback to this repo). */
export function offeringDir(offeringSlug: string): string | null {
  return findCollectionItem("offerings", offeringSlug)?.dir ?? null;
}

/** Folder of a site, or null when no configured source has it (no fallback to this repo). */
export function siteDir(siteSlug: string): string | null {
  return findCollectionItem("sites", siteSlug)?.dir ?? null;
}

export function customerOfOffering(offeringSlug: string): string | null {
  return findCollectionItem("offerings", offeringSlug)?.customer ?? null;
}

export function customerOfSite(siteSlug: string): string | null {
  return findCollectionItem("sites", siteSlug)?.customer ?? null;
}

/** Every existing `config/<name>` in the customer's sources, in `sources.yaml` order. */
export function customerConfigFiles(customer: string, name: "students.yaml" | "admins.yaml"): string[] {
  return contentRoots()
    .filter((r) => r.customer === customer)
    .map((r) => path.join(/*turbopackIgnore: true*/ r.dir, "config", name))
    .filter((p) => fs.existsSync(p));
}

/** Every `content/offerings` and `content/sites` folder across sources (for write guards). */
export function allCollectionDirs(): string[] {
  const out: string[] = [];
  for (const root of contentRoots()) {
    out.push(collectionDir(root, "offerings"), collectionDir(root, "sites"));
  }
  return out;
}

/*
 * Symlink containment. Repositories can contain symlinks, and git checkouts keep them, so a file
 * that looks like it belongs to one source could point into another source (another customer's
 * students.yaml, say). Every content read goes through readContentFile/assertNoCrossSourceLink,
 * which require the file's real location to be in the same source as its logical location.
 */

function realpathOrNull(p: string): string | null {
  try {
    return fs.realpathSync(/*turbopackIgnore: true*/ p);
  } catch {
    return null;
  }
}

/** True when `child` is `parent` or inside it (both absolute). */
export function isPathInside(child: string, parent: string): boolean {
  const rel = path.relative(/*turbopackIgnore: true*/ parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Deepest root containing `p`, comparing against each root's real (`real`) or configured path. */
function owningRoot(p: string, real: boolean): ContentRoot | null {
  let best: { root: ContentRoot; len: number } | null = null;
  for (const root of contentRoots()) {
    const base = real ? realpathOrNull(root.dir) : path.resolve(/*turbopackIgnore: true*/ root.dir);
    if (!base || !isPathInside(p, base)) continue;
    if (!best || base.length > best.len) best = { root, len: base.length };
  }
  return best?.root ?? null;
}

const sameRoot = (a: ContentRoot | null, b: ContentRoot | null) =>
  !!a && !!b && a.customer === b.customer && a.sourceId === b.sourceId;

/**
 * Throws if `file` (which may not exist yet) resolves, through symlinks, to a location owned by a
 * different source than the one its path belongs to. Missing files pass; callers handle them.
 */
export function assertNoCrossSourceLink(file: string): void {
  const logical = owningRoot(path.resolve(/*turbopackIgnore: true*/ file), false);
  let probe = path.resolve(/*turbopackIgnore: true*/ file);
  let real = realpathOrNull(probe);
  // For a file that does not exist yet (publish target), check its nearest existing parent.
  while (!real && path.dirname(probe) !== probe) {
    probe = path.dirname(probe);
    real = realpathOrNull(probe);
  }
  if (!real) return;
  const actual = owningRoot(real, true);
  // Outside every source on both sides: nothing to leak across (other guards bound such paths).
  if (!logical && !actual) return;
  if (!sameRoot(logical, actual)) {
    throw new Error(`Refusing to use ${file}: it links outside its content source.`);
  }
}

/** Read a content or config file after {@link assertNoCrossSourceLink}. */
export function readContentFile(file: string): string {
  assertNoCrossSourceLink(file);
  return fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8");
}

/**
 * Real path of an existing regular file that stays inside `rootDir` (after resolving symlinks) and
 * inside the same source; null otherwise. Used for asset downloads.
 */
export function containedFileRealPath(file: string, rootDir: string): string | null {
  const real = realpathOrNull(file);
  const realRoot = realpathOrNull(rootDir);
  if (!real || !realRoot || !isPathInside(real, realRoot)) return null;
  try {
    assertNoCrossSourceLink(file);
    if (!fs.statSync(/*turbopackIgnore: true*/ real).isFile()) return null;
  } catch {
    return null;
  }
  return real;
}
