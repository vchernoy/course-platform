import fs from "fs";
import path from "path";
import yaml from "yaml";
import { assertSafeSlug, isSafeSlug } from "@/lib/slug";

export type SiteVisibility = "private" | "public" | "unlisted";

export type SiteNavItem = {
  title: string;
  /** Logical page id: `index` maps to `pages/index.mdx`, otherwise `pages/<page>.mdx`. */
  page: string;
};

/** Parsed `site.yaml` (filesystem checks happen in {@link loadSite}). */
export type SiteMeta = {
  title: string;
  visibility?: SiteVisibility;
  navigation: SiteNavItem[];
};

const CONTENT_SITES_ROOT = path.join(process.cwd(), "content", "sites");

function prefix(msg: string) {
  return `site.yaml: ${msg}`;
}

const VISIBILITIES = new Set<SiteVisibility>(["private", "public", "unlisted"]);

/** Validates parsed YAML from `site.yaml` (shape only; disk checks in {@link loadSite}). */
export function validateSiteContent(raw: unknown): SiteMeta {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix(`root must be a mapping (object). Got: ${String(raw)}`));
  }

  const o = raw as Record<string, unknown>;

  if (typeof o.title !== "string" || !o.title.trim()) {
    throw new Error(prefix('"title" is required and must be a non-empty string'));
  }

  if ("visibility" in o && o.visibility !== undefined) {
    if (
      typeof o.visibility !== "string" ||
      !VISIBILITIES.has(o.visibility.trim() as SiteVisibility)
    ) {
      throw new Error(prefix(`"visibility" must be one of: private | public | unlisted`));
    }
  }

  if (!("navigation" in o)) {
    throw new Error(prefix('"navigation" is required'));
  }
  if (!Array.isArray(o.navigation)) {
    throw new Error(prefix('"navigation" must be an array'));
  }

  const navigation: SiteNavItem[] = [];

  for (let i = 0; i < o.navigation.length; i++) {
    const item = o.navigation[i];
    const idx = `navigation[${i}]`;
    if (item === null || typeof item !== "object") {
      throw new Error(prefix(`${idx} must be an object`));
    }
    const row = item as Record<string, unknown>;
    if (typeof row.title !== "string" || !row.title.trim()) {
      throw new Error(prefix(`${idx}.title must be a non-empty string`));
    }
    if (typeof row.page !== "string" || !row.page.trim()) {
      throw new Error(prefix(`${idx}.page must be a non-empty string`));
    }
    const page = row.page.trim();
    if (page !== "index" && !isSafeSlug(page)) {
      throw new Error(prefix(`${idx}.page must be "index" or a safe slug, got ${JSON.stringify(page)}`));
    }
    navigation.push({ title: row.title.trim(), page });
  }

  const out: SiteMeta = {
    title: o.title.trim(),
    navigation,
  };
  if (typeof o.visibility === "string" && VISIBILITIES.has(o.visibility.trim() as SiteVisibility)) {
    out.visibility = o.visibility.trim() as SiteVisibility;
  }
  return out;
}

export function siteYamlPath(siteSlug: string): string {
  return path.join(CONTENT_SITES_ROOT, siteSlug, "site.yaml");
}

export function sitePagesDir(siteSlug: string): string {
  return path.join(CONTENT_SITES_ROOT, siteSlug, "pages");
}

/** Path to the MDX file for a logical page slug (`index` → `index.mdx`). */
export function sitePageFilePath(siteSlug: string, pageSlug: string): string {
  assertSafeSlug("siteSlug", siteSlug);
  if (pageSlug === "index") {
    return path.join(sitePagesDir(siteSlug), "index.mdx");
  }
  assertSafeSlug("pageSlug", pageSlug);
  return path.join(sitePagesDir(siteSlug), `${pageSlug}.mdx`);
}

function verifySiteOnDisk(siteSlug: string, meta: SiteMeta): void {
  const indexPath = sitePageFilePath(siteSlug, "index");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Site "${siteSlug}" is missing required ${path.relative(process.cwd(), indexPath)}`);
  }

  for (let i = 0; i < meta.navigation.length; i++) {
    const { page } = meta.navigation[i]!;
    const p = sitePageFilePath(siteSlug, page);
    if (!fs.existsSync(p)) {
      throw new Error(
        prefix(
          `navigation[${i}] points to missing page file for "${page}" (${path.relative(process.cwd(), p)})`
        )
      );
    }
  }
}

export function loadSite(siteSlug: string): SiteMeta {
  assertSafeSlug("siteSlug", siteSlug);
  const yamlPath = siteYamlPath(siteSlug);
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Site not found: ${siteSlug} (missing ${yamlPath})`);
  }
  const raw = yaml.parse(fs.readFileSync(yamlPath, "utf8"));
  const meta = validateSiteContent(raw);
  verifySiteOnDisk(siteSlug, meta);
  return meta;
}

/**
 * Site folders under `content/sites` that have `site.yaml` and `pages/index.mdx`.
 * Invalid YAML is skipped (same spirit as listing offerings with broken yaml still appearing — callers use {@link loadSite} which throws).
 */
export function listSiteSlugs(): string[] {
  if (!fs.existsSync(CONTENT_SITES_ROOT)) return [];
  const names = fs.readdirSync(CONTENT_SITES_ROOT, { withFileTypes: true });
  const slugs: string[] = [];
  for (const d of names) {
    if (!d.isDirectory()) continue;
    const slug = d.name;
    if (!isSafeSlug(slug)) continue;
    if (!fs.existsSync(siteYamlPath(slug))) continue;
    if (!fs.existsSync(sitePageFilePath(slug, "index"))) continue;
    try {
      const raw = yaml.parse(fs.readFileSync(siteYamlPath(slug), "utf8"));
      const meta = validateSiteContent(raw);
      verifySiteOnDisk(slug, meta);
      slugs.push(slug);
    } catch {
      /* skip invalid sites */
    }
  }
  slugs.sort();
  return slugs;
}

/** Basenames under `pages/` as logical slugs (`index.mdx` → `index`). */
export function listSitePageSlugs(siteSlug: string): string[] {
  assertSafeSlug("siteSlug", siteSlug);
  const dir = sitePagesDir(siteSlug);
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!name.isFile() || !name.name.endsWith(".mdx")) continue;
    const base = name.name.slice(0, -".mdx".length);
    if (base === "index") {
      out.push("index");
      continue;
    }
    if (isSafeSlug(base)) out.push(base);
  }
  out.sort((a, b) => {
    if (a === "index") return -1;
    if (b === "index") return 1;
    return a.localeCompare(b);
  });
  return out;
}

export function loadSitePageSource(siteSlug: string, pageSlug: string): string {
  assertSafeSlug("siteSlug", siteSlug);
  if (pageSlug !== "index") {
    assertSafeSlug("pageSlug", pageSlug);
  }
  const filePath = sitePageFilePath(siteSlug, pageSlug);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Site page missing: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

/** Treat missing visibility as private (safest default). */
export function effectiveSiteVisibility(meta: SiteMeta): SiteVisibility {
  return meta.visibility ?? "private";
}

/** Whether this site may be rendered on public `/s/*` routes (public or unlisted). */
export function isPublicSite(meta: SiteMeta): boolean {
  const v = effectiveSiteVisibility(meta);
  return v === "public" || v === "unlisted";
}
