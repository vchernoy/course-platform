import { normalizeEmail } from "@/lib/students";

const MAX_BASENAME = 200;

/**
 * Stable filename fragment from an admin email, e.g. `user@gmail.com` → `user-gmail-com`.
 * Lowercase; rejects emails that cannot yield a safe basename.
 */
export function sanitizeDraftEmailBasename(email: string): string {
  const n = normalizeEmail(email);
  const at = n.lastIndexOf("@");
  if (at <= 0 || at === n.length - 1) {
    throw new Error("Invalid email for draft filename.");
  }
  const local = n.slice(0, at);
  const domain = n.slice(at + 1);
  if (!local || !domain) {
    throw new Error("Invalid email for draft filename.");
  }

  const safeLocal = local
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeDomain = domain
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const combined = `${safeLocal || "user"}-${safeDomain || "invalid"}`.toLowerCase();
  if (combined.length > MAX_BASENAME) {
    throw new Error("Email produces draft basename that is too long.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(combined)) {
    throw new Error("Email cannot be mapped to a safe draft filename.");
  }
  return combined;
}
