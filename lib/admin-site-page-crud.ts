import fs from "fs";
import path from "path";
import yaml from "yaml";
import { validateSiteContent, type SiteMeta } from "@/lib/sites";
import { assertSafeSlug, isSafeSlug, SLUG_MAX_LENGTH } from "@/lib/slug";

const PAGE_TITLE_MAX = 240;

export type SiteCrudResult = { ok: true } | { ok: false; error: string };

export type CreateSitePageInput = {
  title: string;
  slug: string;
  addToNavigation: boolean;
};

function projectSitesRoot(projectRoot: string): string {
  return path.resolve(path.join(projectRoot, "content", "sites"));
}

function assertPathUnderSitesRoot(siteRootResolved: string, targetPath: string): void {
  const resolved = path.resolve(targetPath);
  const rel = path.relative(siteRootResolved, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Refusing to write outside content/sites/<siteSlug>.");
  }
}

export function resolveSitePageFilePath(
  projectRoot: string,
  siteSlug: string,
  pageSlug: string
): string {
  assertSafeSlug("siteSlug", siteSlug);
  const pagesDir = path.join(projectRoot, "content", "sites", siteSlug, "pages");
  if (pageSlug === "index") {
    return path.join(pagesDir, "index.mdx");
  }
  assertSafeSlug("pageSlug", pageSlug);
  return path.join(pagesDir, `${pageSlug}.mdx`);
}

export function siteYamlFilePath(projectRoot: string, siteSlug: string): string {
  assertSafeSlug("siteSlug", siteSlug);
  return path.join(projectRoot, "content", "sites", siteSlug, "site.yaml");
}

export function tryReadSiteMetaFromYaml(projectRoot: string, siteSlug: string): SiteMeta | null {
  try {
    const yamlPath = siteYamlFilePath(projectRoot, siteSlug);
    if (!fs.existsSync(yamlPath)) return null;
    const raw = yaml.parse(fs.readFileSync(yamlPath, "utf8"));
    return validateSiteContent(raw);
  } catch {
    return null;
  }
}

export function writeSiteYaml(projectRoot: string, siteSlug: string, meta: SiteMeta): void {
  assertSafeSlug("siteSlug", siteSlug);
  const yamlPath = siteYamlFilePath(projectRoot, siteSlug);
  const siteRoot = path.join(projectSitesRoot(projectRoot), siteSlug);
  assertPathUnderSitesRoot(path.resolve(siteRoot), yamlPath);

  const doc: Record<string, unknown> = {
    title: meta.title,
    navigation: meta.navigation.map((n) => ({ title: n.title, page: n.page })),
  };
  if (meta.visibility !== undefined) {
    doc.visibility = meta.visibility;
  }
  fs.writeFileSync(yamlPath, yaml.stringify(doc), "utf8");
}

export function validateNewSitePageSlug(slug: string): string | null {
  const t = slug.trim();
  if (!t) return "Page slug is required.";
  if (t === "index") return 'The "index" page cannot be created here.';
  if (t.length > SLUG_MAX_LENGTH) return "Page slug is too long.";
  if (!isSafeSlug(t)) {
    return "Page slug must be lowercase letters, digits, and hyphen-separated segments.";
  }
  return null;
}

export function validatePageTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return "Title is required.";
  if (t.length > PAGE_TITLE_MAX) return "Title is too long.";
  return null;
}

export function buildStarterSitePageMdx(title: string): string {
  return `# ${title.trim()}\n\n`;
}

export function createSitePageOnDisk(
  projectRoot: string,
  siteSlug: string,
  input: CreateSitePageInput
): SiteCrudResult {
  const titleErr = validatePageTitle(input.title);
  if (titleErr) return { ok: false, error: titleErr };
  const slugErr = validateNewSitePageSlug(input.slug);
  if (slugErr) return { ok: false, error: slugErr };

  const pageSlug = input.slug.trim();

  let meta = tryReadSiteMetaFromYaml(projectRoot, siteSlug);
  if (!meta) return { ok: false, error: "Site not found." };

  const siteRootResolved = path.resolve(path.join(projectSitesRoot(projectRoot), siteSlug));
  const pagePath = resolveSitePageFilePath(projectRoot, siteSlug, pageSlug);
  assertPathUnderSitesRoot(siteRootResolved, pagePath);

  if (fs.existsSync(pagePath)) {
    return { ok: false, error: `A page with slug "${pageSlug}" already exists.` };
  }

  try {
    const pagesDir = path.dirname(pagePath);
    if (!fs.existsSync(pagesDir)) {
      fs.mkdirSync(pagesDir, { recursive: true });
    }
    fs.writeFileSync(pagePath, buildStarterSitePageMdx(input.title.trim()), "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  if (!input.addToNavigation) {
    return { ok: true };
  }

  try {
    meta = tryReadSiteMetaFromYaml(projectRoot, siteSlug);
    if (!meta) {
      fs.unlinkSync(pagePath);
      return { ok: false, error: "Site not found." };
    }
    if (meta.navigation.some((n) => n.page === pageSlug)) {
      fs.unlinkSync(pagePath);
      return { ok: false, error: `Navigation already includes page "${pageSlug}".` };
    }
    const next: SiteMeta = {
      ...meta,
      navigation: [...meta.navigation, { title: input.title.trim(), page: pageSlug }],
    };
    writeSiteYaml(projectRoot, siteSlug, next);
  } catch (e) {
    try {
      fs.unlinkSync(pagePath);
    } catch {
      /* best effort rollback */
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export function deleteSitePageOnDisk(
  projectRoot: string,
  siteSlug: string,
  pageSlug: string
): SiteCrudResult {
  if (!isSafeSlug(siteSlug)) return { ok: false, error: "Invalid site slug." };
  if (pageSlug === "index") return { ok: false, error: "The home page (index) cannot be deleted." };
  if (!isSafeSlug(pageSlug)) return { ok: false, error: "Invalid page slug." };

  const siteRootResolved = path.resolve(path.join(projectSitesRoot(projectRoot), siteSlug));
  const pagePath = resolveSitePageFilePath(projectRoot, siteSlug, pageSlug);
  assertPathUnderSitesRoot(siteRootResolved, pagePath);

  const meta = tryReadSiteMetaFromYaml(projectRoot, siteSlug);
  if (!meta) return { ok: false, error: "Site not found." };

  try {
    const nextNav = meta.navigation.filter((n) => n.page !== pageSlug);
    const nextMeta: SiteMeta = { ...meta, navigation: nextNav };
    writeSiteYaml(projectRoot, siteSlug, nextMeta);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  try {
    if (fs.existsSync(pagePath)) {
      fs.unlinkSync(pagePath);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  return { ok: true };
}
