import Link from "next/link";
import type { Metadata } from "next";
import { createGitContentRepository } from "@/lib/content-repository";
import { listAdminAllowedOfferingSlugs } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import {
  effectiveOfferingVisibility,
  getOrderedLessons,
  isPublicOfferingLanding,
  listOfferingSlugs,
} from "@/lib/offerings";

export const metadata: Metadata = {
  title: "Admin · Offerings",
};

export default async function AdminOfferingsPage() {
  const email = await getCurrentUserEmail();
  const allowedSlugs = listAdminAllowedOfferingSlugs(email, listOfferingSlugs());
  const repo = createGitContentRepository();
  const rows = await Promise.all(
    allowedSlugs.map(async (slug) => ({ slug, offering: await repo.getOffering(slug) }))
  );

  return (
    <main>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Offerings</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Only offerings your admin account may access are listed.
      </p>

      <ul className="mt-8 space-y-4">
        {rows.map(({ slug, offering: o }) => {
          const lessonCount = getOrderedLessons(o).length;
          const visibility = effectiveOfferingVisibility(o);
          const dateLine = [o.startDate, o.endDate].filter(Boolean).join(" → ");
          const publicOk = isPublicOfferingLanding(o);

          return (
            <li
              key={slug}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">{o.title}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{slug}</p>
                </div>
                <Link
                  href={`/admin/offerings/${slug}`}
                  className="text-sm font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
                >
                  Admin detail
                </Link>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Format</dt>
                  <dd className="font-medium text-zinc-800">{o.format}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Visibility</dt>
                  <dd className="font-medium text-zinc-800">{visibility}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Lessons</dt>
                  <dd className="font-medium text-zinc-800">{lessonCount}</dd>
                </div>
                {dateLine ? (
                  <div>
                    <dt className="text-zinc-500">Dates</dt>
                    <dd className="font-medium text-zinc-800">{dateLine}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-100 pt-4 text-sm">
                {publicOk ? (
                  <Link
                    href={`/p/${slug}`}
                    className="text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
                  >
                    Open public page
                  </Link>
                ) : (
                  <span className="text-zinc-400" title="Offering is private">
                    Public page unavailable
                  </span>
                )}
                <Link
                  href={`/offerings/${slug}`}
                  className="text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
                >
                  Open private overview
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">
          No offerings match your admin scope. Ask an owner to update{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">config/admins.yaml</code>.
        </p>
      ) : null}
    </main>
  );
}
