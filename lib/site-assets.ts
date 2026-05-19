import fs from "fs";
import path from "path";
import { resolveUnderAssetsRoot } from "@/lib/offering-assets";
import { assertSafeAssetSegments, assertSafeSlug, isSafeSlug } from "@/lib/slug";

const CONTENT_SITES = path.join(process.cwd(), "content", "sites");

export function siteAssetsDir(siteSlug: string): string {
  assertSafeSlug("siteSlug", siteSlug);
  return path.join(CONTENT_SITES, siteSlug, "assets");
}

/**
 * Rewrite markdown links/images so `](../assets/foo` resolves under this site’s asset API.
 * Same pattern as lesson MDX (`rewriteLessonAssetUrls`).
 */
export function rewriteSiteAssetUrls(source: string, siteSlug: string): string {
  if (!isSafeSlug(siteSlug)) return source;
  const base = `](/api/site-assets/${siteSlug}/`;
  return source.replace(/\]\(\.\.\/assets\//g, base);
}

/** Build `/api/site-assets/...` URL for a path relative to `assets/` (or pass through absolute/http URLs). */
export function buildSiteAssetHref(siteSlug: string, pathOrFile: string): string {
  const s = pathOrFile.trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;

  const encoded = s
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  return `/api/site-assets/${siteSlug}/${encoded}`;
}

export function safeSiteAssetFilePath(siteSlug: string, segments: string[]): string | null {
  try {
    assertSafeSlug("siteSlug", siteSlug);
    assertSafeAssetSegments(segments);
  } catch {
    return null;
  }
  const root = siteAssetsDir(siteSlug);
  const resolved = resolveUnderAssetsRoot(root, segments);
  if (!resolved) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
