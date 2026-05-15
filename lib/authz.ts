import { currentUser } from "@clerk/nextjs/server";
import { emailHasCourseAccess, normalizeEmail } from "@/lib/students";

/**
 * Primary Clerk email used for allowlist matching.
 * Uses primary email when set; otherwise first verified email address.
 */
export async function getCurrentUserEmail(): Promise<string | undefined> {
  const user = await currentUser();
  if (!user) return undefined;

  const primary = user.primaryEmailAddress?.emailAddress;
  if (primary) return normalizeEmail(primary);

  const verified = user.emailAddresses.find(
    (addr) => addr.verification?.status === "verified"
  );
  const fallback = verified?.emailAddress;
  return fallback ? normalizeEmail(fallback) : undefined;
}

/** Authorize against config/students.yaml (server-side file read). */
export function canAccessCourse(
  email: string | undefined,
  courseSlug: string
): boolean {
  if (!email) return false;
  return emailHasCourseAccess(email, courseSlug);
}
