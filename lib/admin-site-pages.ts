import type { SiteMeta } from "@/lib/sites";

/** Navigation label from site.yaml when the page appears there; otherwise the slug. */
export function getSitePageDisplayTitle(site: SiteMeta, pageSlug: string): string {
  const hit = site.navigation.find((n) => n.page === pageSlug);
  const title = hit?.title?.trim();
  return title || pageSlug;
}
