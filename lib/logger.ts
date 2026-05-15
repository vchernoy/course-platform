/**
 * Production-safe server logging.
 *
 * Never log Clerk tokens, cookies, Authorization headers, or raw user emails here.
 * Prefer coarse diagnostic codes in production; use verbose details only under NODE_ENV=development.
 */
export function logDevWarning(scope: string, detail?: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[${scope}]`, detail);
}

/** Minimal production breadcrumb (no PII, no filesystem paths). No-op outside production. */
export function logProdDiagnostic(scope: string, code: string): void {
  if (process.env.NODE_ENV !== "production") return;
  console.warn(`[${scope}] ${code}`);
}
