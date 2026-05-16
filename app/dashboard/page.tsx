import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeSignOutButton } from "@/components/HomeSignOutButton";
import { getCurrentUserEmail } from "@/lib/authz";
import { getOrderedLessons, listOfferingSlugs, loadOffering } from "@/lib/offerings";
import { emailHasOfferingAccess } from "@/lib/students";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const email = await getCurrentUserEmail();
  const allSlugs = listOfferingSlugs();
  const accessible = email
    ? allSlugs.filter((slug) => emailHasOfferingAccess(email, slug))
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Signed in as{" "}
        <span className="font-medium text-zinc-800">{email ?? "—"}</span>
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Your offerings
        </h2>

        {accessible.length === 0 ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center">
            <p className="text-zinc-700">
              You do not have access to any offerings yet. Ask your administrator to add your email
              under <code className="font-mono text-sm">offerings</code> in{" "}
              <code className="font-mono text-sm">config/students.yaml</code>.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {accessible.map((slug) => {
              const offering = loadOffering(slug);
              const first = getOrderedLessons(offering)[0];
              const href = first
                ? `/offerings/${slug}/${first.lessonSlug}`
                : `/offerings/${slug}/lesson-1`;

              return (
                <li key={slug}>
                  <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {offering.format}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-zinc-900">
                          {offering.title}
                        </h3>
                        {offering.description ? (
                          <p className="mt-2 text-sm text-zinc-600">{offering.description}</p>
                        ) : null}
                        {offering.startDate || offering.endDate ? (
                          <p className="mt-2 text-xs text-zinc-500">
                            {[offering.startDate, offering.endDate].filter(Boolean).join(" → ")}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={href}
                        className="inline-flex shrink-0 justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        Open
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/" className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900">
          Home
        </Link>
        <HomeSignOutButton />
      </div>
    </main>
  );
}
