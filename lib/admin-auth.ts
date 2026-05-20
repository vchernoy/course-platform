import {
  emailIsAdminFromConfig,
  getAdminAccessFromConfig,
  loadAdmins,
  canAdminAccessOfferingFromConfig,
  canAdminAccessSiteFromConfig,
  canAdminMutateSiteFromConfig,
  listAdminAllowedOfferingSlugsFromConfig,
  listAdminAllowedSiteSlugsFromConfig,
  type AdminAccess,
} from "@/lib/admins";

/** True if this email appears in `config/admins.yaml` (any role). */
export function emailIsAdmin(email: string | undefined): boolean {
  return emailIsAdminFromConfig(loadAdmins(), email);
}

/** Resolved role and offering scope for this admin, or null if not an admin. */
export function getAdminAccess(email: string | undefined): AdminAccess | null {
  return getAdminAccessFromConfig(loadAdmins(), email);
}

/** Alias: admin panel requires any configured admin row. */
export function canAccessAdmin(email: string | undefined): boolean {
  return emailIsAdmin(email);
}

export function canAdminAccessOffering(
  email: string | undefined,
  offeringSlug: string
): boolean {
  return canAdminAccessOfferingFromConfig(loadAdmins(), email, offeringSlug);
}

export function listAdminAllowedOfferingSlugs(
  email: string | undefined,
  allOfferingSlugs: readonly string[]
): string[] {
  return listAdminAllowedOfferingSlugsFromConfig(loadAdmins(), email, allOfferingSlugs);
}

export function canAdminAccessSite(email: string | undefined, siteSlug: string): boolean {
  return canAdminAccessSiteFromConfig(loadAdmins(), email, siteSlug);
}

/** Create/delete published site pages (Phase 4A): owner/editor on a site-granting assignment only. */
export function canAdminMutateSite(email: string | undefined, siteSlug: string): boolean {
  return canAdminMutateSiteFromConfig(loadAdmins(), email, siteSlug);
}

export function listAdminAllowedSiteSlugs(
  email: string | undefined,
  allSiteSlugs: readonly string[]
): string[] {
  return listAdminAllowedSiteSlugsFromConfig(loadAdmins(), email, allSiteSlugs);
}
