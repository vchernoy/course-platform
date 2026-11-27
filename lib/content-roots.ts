import fs from "fs";
import path from "path";
import { isSafeSlug } from "@/lib/slug";

/**
 * Content can come from two roots with the same layout:
 *
 *   <root>/config/students.yaml, <root>/config/admins.yaml
 *   <root>/content/offerings/<slug>/offering.yaml ...
 *   <root>/content/sites/<slug>/site.yaml ...
 *
 * - **Public root:** this repository (`process.cwd()`). Holds code and sample content.
 * - **Private root:** a checkout of a private repository, by default `private-content/`
 *   (gitignored; filled at build time by `scripts/sync-private-content.mjs`).
 *   Override the location with `PRIVATE_CONTENT_DIR` (absolute or relative to cwd).
 *
 * Offerings and sites are merged from both roots; the same slug in both is an error.
 * Config files (`students.yaml`, `admins.yaml`) from the private root **replace** the public ones.
 * See docs/private-content.md.
 */

export type ContentRootKind = "private" | "public";

export type ContentRoot = { kind: ContentRootKind; dir: string };

export type ContentCollection = "offerings" | "sites";

const DEFAULT_PRIVATE_DIR = "private-content";

export function publicRootDir(): string {
  return process.cwd();
}

/** Absolute path of the private root, whether or not it exists. */
export function privateRootDir(): string {
  const configured = process.env.PRIVATE_CONTENT_DIR?.trim();
  return path.resolve(publicRootDir(), configured || DEFAULT_PRIVATE_DIR);
}

/** Roots that exist on disk, private first. */
export function contentRoots(): ContentRoot[] {
  const roots: ContentRoot[] = [];
  const priv = privateRootDir();
  if (priv !== publicRootDir() && isDirectory(priv)) {
    roots.push({ kind: "private", dir: priv });
  }
  roots.push({ kind: "public", dir: publicRootDir() });
  return roots;
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function collectionDir(root: ContentRoot, collection: ContentCollection): string {
  return path.join(root.dir, "content", collection);
}

/** File that marks a folder as an item of the collection. */
function markerFile(collection: ContentCollection): string {
  return collection === "offerings" ? "offering.yaml" : "site.yaml";
}

type Entry = { slug: string; root: ContentRoot; dir: string };

function scanCollection(collection: ContentCollection): Map<string, Entry> {
  const found = new Map<string, Entry>();
  for (const root of contentRoots()) {
    const base = collectionDir(root, collection);
    if (!isDirectory(base)) continue;
    for (const d of fs.readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory() || !isSafeSlug(d.name)) continue;
      const dir = path.join(base, d.name);
      if (!fs.existsSync(path.join(dir, markerFile(collection)))) continue;
      const prev = found.get(d.name);
      if (prev) {
        throw new Error(
          `Duplicate ${collection} slug "${d.name}" in both ${prev.root.kind} and ${root.kind} content ` +
            `(${prev.dir} and ${dir}). Rename one of them.`
        );
      }
      found.set(d.name, { slug: d.name, root, dir });
    }
  }
  return found;
}

/** Sorted slugs of all offerings or sites across roots. Throws on duplicate slugs. */
export function listCollectionSlugs(collection: ContentCollection): string[] {
  return [...scanCollection(collection).keys()].sort();
}

/**
 * Folder of one offering or site. Returns the folder in the root that has it; when no root
 * has it, returns the public path (callers report "not found" with that path).
 * Callers must validate `slug` first.
 */
export function resolveCollectionItemDir(collection: ContentCollection, slug: string): string {
  return resolveCollectionItem(collection, slug).dir;
}

/** Like {@link resolveCollectionItemDir} but also returns which root the item lives in. */
export function resolveCollectionItem(
  collection: ContentCollection,
  slug: string
): { dir: string; root: ContentRoot } {
  for (const root of contentRoots()) {
    const dir = path.join(collectionDir(root, collection), slug);
    if (fs.existsSync(path.join(dir, markerFile(collection)))) {
      return { dir, root };
    }
  }
  const root: ContentRoot = { kind: "public", dir: publicRootDir() };
  return { dir: path.join(collectionDir(root, collection), slug), root };
}

export function offeringDir(offeringSlug: string): string {
  return resolveCollectionItemDir("offerings", offeringSlug);
}

export function siteDir(siteSlug: string): string {
  return resolveCollectionItemDir("sites", siteSlug);
}

/** `config/<name>` from the private root when that file exists, else from the public root. */
export function configFilePath(name: "students.yaml" | "admins.yaml"): string {
  for (const root of contentRoots()) {
    const p = path.join(root.dir, "config", name);
    if (fs.existsSync(p)) return p;
  }
  return path.join(publicRootDir(), "config", name);
}

/** Every `content/offerings` and `content/sites` folder across roots (for write guards). */
export function allCollectionDirs(): string[] {
  const out: string[] = [];
  for (const root of contentRoots()) {
    out.push(collectionDir(root, "offerings"), collectionDir(root, "sites"));
  }
  return out;
}
