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

/** The source that holds an offering or site, or null if none does. Callers validate `slug`. */
export function findCollectionItem(collection: ContentCollection, slug: string): CollectionItem | null {
  if (!isSafeSlug(slug)) return null;
  for (const root of contentRoots()) {
    const dir = path.join(/*turbopackIgnore: true*/ collectionDir(root, collection), slug);
    if (fs.existsSync(path.join(/*turbopackIgnore: true*/ dir, markerFile(collection)))) {
      return { slug, customer: root.customer, root, dir };
    }
  }
  return null;
}

/**
 * Folder of one offering or site. When no source has it, returns a path under this repository
 * (callers then report "not found" with that path).
 */
export function resolveCollectionItemDir(collection: ContentCollection, slug: string): string {
  return findCollectionItem(collection, slug)?.dir ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "content", collection, slug);
}

export function offeringDir(offeringSlug: string): string {
  return resolveCollectionItemDir("offerings", offeringSlug);
}

export function siteDir(siteSlug: string): string {
  return resolveCollectionItemDir("sites", siteSlug);
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
