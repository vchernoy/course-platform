import {
  emailIsAdminFromConfig,
  getAdminAccessFromConfig,
  loadAdminsForCustomer,
  mergeAdminsConfigs,
  canAdminAccessOfferingFromConfig,
  canAdminAccessSiteFromConfig,
  canAdminMutateOfferingFromConfig,
  canAdminMutateSiteFromConfig,
  listAdminAllowedOfferingSlugsFromConfig,
  listAdminAllowedSiteSlugsFromConfig,
  type AdminAccess,
  type AdminsConfig,
} from "@/lib/admins";
import { customerOfOffering, customerOfSite, listCustomerIds } from "@/lib/content-roots";

/*
 * Admin rights are per customer: an assignment in one customer's admins.yaml applies only to that
 * customer's offerings and sites (`platform` scope = all of that customer's items).
 */

function adminsForOffering(offeringSlug: string): AdminsConfig | null {
  const customer = customerOfOffering(offeringSlug);
  return customer ? loadAdminsForCustomer(customer) : null;
}

function adminsForSite(siteSlug: string): AdminsConfig | null {
  const customer = customerOfSite(siteSlug);
  return customer ? loadAdminsForCustomer(customer) : null;
}

/** True if this email is an admin of any customer. */
export function emailIsAdmin(email: string | undefined): boolean {
  return listCustomerIds().some((c) => emailIsAdminFromConfig(loadAdminsForCustomer(c), email));
}

/**
 * Role and assignments across all customers (for display only; authorization uses the
 * per-item checks below, which never mix customers).
 */
export function getAdminAccess(email: string | undefined): AdminAccess | null {
  const merged = mergeAdminsConfigs(listCustomerIds().map((c) => loadAdminsForCustomer(c)));
  return getAdminAccessFromConfig(merged, email);
}

/** Alias: admin panel requires any configured admin row. */
export function canAccessAdmin(email: string | undefined): boolean {
  return emailIsAdmin(email);
}

export function canAdminAccessOffering(email: string | undefined, offeringSlug: string): boolean {
  const config = adminsForOffering(offeringSlug);
  return config ? canAdminAccessOfferingFromConfig(config, email, offeringSlug) : false;
}

/** Save/discard/publish lesson drafts: owner/editor on an offering-granting assignment only. */
export function canAdminMutateOffering(email: string | undefined, offeringSlug: string): boolean {
  const config = adminsForOffering(offeringSlug);
  return config ? canAdminMutateOfferingFromConfig(config, email, offeringSlug) : false;
}

/** Filters slugs to those this admin may manage, checking each against its own customer. */
export function listAdminAllowedOfferingSlugs(
  email: string | undefined,
  allOfferingSlugs: readonly string[]
): string[] {
  const allowed = new Set<string>();
  for (const customer of listCustomerIds()) {
    const mine = allOfferingSlugs.filter((s) => customerOfOffering(s) === customer);
    if (mine.length === 0) continue;
    for (const s of listAdminAllowedOfferingSlugsFromConfig(loadAdminsForCustomer(customer), email, mine)) {
      allowed.add(s);
    }
  }
  return allOfferingSlugs.filter((s) => allowed.has(s));
}

export function canAdminAccessSite(email: string | undefined, siteSlug: string): boolean {
  const config = adminsForSite(siteSlug);
  return config ? canAdminAccessSiteFromConfig(config, email, siteSlug) : false;
}

/** Create/delete published site pages (Phase 4A) and site page drafts: owner/editor on a site-granting assignment only. */
export function canAdminMutateSite(email: string | undefined, siteSlug: string): boolean {
  const config = adminsForSite(siteSlug);
  return config ? canAdminMutateSiteFromConfig(config, email, siteSlug) : false;
}

export function listAdminAllowedSiteSlugs(
  email: string | undefined,
  allSiteSlugs: readonly string[]
): string[] {
  const allowed = new Set<string>();
  for (const customer of listCustomerIds()) {
    const mine = allSiteSlugs.filter((s) => customerOfSite(s) === customer);
    if (mine.length === 0) continue;
    for (const s of listAdminAllowedSiteSlugsFromConfig(loadAdminsForCustomer(customer), email, mine)) {
      allowed.add(s);
    }
  }
  return allSiteSlugs.filter((s) => allowed.has(s));
}
