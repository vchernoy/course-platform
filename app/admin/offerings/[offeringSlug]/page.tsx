import Link from "next/link";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { canAdminAccessOffering } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import { loadOfferingResources } from "@/lib/offering-resources";
import { loadOfferingVideos } from "@/lib/offering-videos";
import {
  effectiveOfferingVisibility,
  getOrderedLessons,
  isPublicOfferingLanding,
  loadOffering,
} from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ offeringSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offeringSlug } = await params;
  if (!isSafeSlug(offeringSlug)) {
    return { title: "Admin · Offering" };
  }
  try {
    const o = loadOffering(offeringSlug);
    return { title: `${o.title} · Admin` };
  } catch {
    return { title: "Admin · Offering" };
  }
}

export default async function AdminOfferingDetailPage({ params }: Props) {
  const { offeringSlug } = await params;

  if (!isSafeSlug(offeringSlug)) {
    notFound();
  }

  const email = await getCurrentUserEmail();
  if (!canAdminAccessOffering(email, offeringSlug)) {
    forbidden();
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    notFound();
  }

  const lessons = getOrderedLessons(offering);
  const visibility = effectiveOfferingVisibility(offering);
  const dateLine = [offering.startDate, offering.endDate].filter(Boolean).join(" → ");
  const publicOk = isPublicOfferingLanding(offering);

  const videos = loadOfferingVideos(offeringSlug);
  const resources = loadOfferingResources(offeringSlug);
  const videoCount = Object.keys(videos).length;
  const resourceCount = Object.keys(resources).length;

  const placeholderCard =
    "rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-5 text-sm text-zinc-600";

  return (
    <main>
      <nav className="text-sm text-zinc-600">
        <Link href="/admin/offerings" className="hover:text-zinc-900">
          Offerings
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <span className="text-zinc-900">{offering.title}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">{offering.title}</h1>
      <p className="mt-1 text-xs text-zinc-500">{offeringSlug}</p>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <dt className="text-zinc-500">Format</dt>
          <dd className="mt-1 font-medium text-zinc-900">{offering.format}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <dt className="text-zinc-500">Visibility</dt>
          <dd className="mt-1 font-medium text-zinc-900">{visibility}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <dt className="text-zinc-500">Lessons</dt>
          <dd className="mt-1 font-medium text-zinc-900">{lessons.length}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <dt className="text-zinc-500">Videos (registry)</dt>
          <dd className="mt-1 font-medium text-zinc-900">{videoCount}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <dt className="text-zinc-500">Resources (registry)</dt>
          <dd className="mt-1 font-medium text-zinc-900">{resourceCount}</dd>
        </div>
        {dateLine ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <dt className="text-zinc-500">Dates</dt>
            <dd className="mt-1 font-medium text-zinc-900">{dateLine}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {publicOk ? (
          <Link
            href={`/p/${offeringSlug}`}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Open public page
          </Link>
        ) : (
          <span
            className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 font-medium text-zinc-400"
            title="Offering is private"
          >
            Public page unavailable
          </span>
        )}
        <Link
          href={`/offerings/${offeringSlug}`}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Open private overview
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Modules & lessons</h2>
        <ol className="mt-4 space-y-6">
          {offering.modules.map((mod) => (
            <li key={mod.slug} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-zinc-900">{mod.title}</p>
              <p className="text-xs text-zinc-500">{mod.slug}</p>
              <ul className="mt-3 space-y-2 border-l border-zinc-200 pl-4">
                {mod.lessons.map((les) => (
                  <li key={les.slug} className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-zinc-700">
                    <span>
                      <span className="font-medium text-zinc-900">{les.title}</span>
                      <span className="text-zinc-400"> · {les.slug}</span>
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      <Link
                        href={`/admin/offerings/${offeringSlug}/lessons/${les.slug}/edit`}
                        className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                      >
                        Edit draft
                      </Link>
                      <Link
                        href={`/admin/offerings/${offeringSlug}/lessons/${les.slug}/preview`}
                        className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                      >
                        Preview
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Coming later</h2>
        <div className={placeholderCard}>
          <p className="font-medium text-zinc-800">Local drafts</p>
          <p className="mt-1">
            Per-admin drafts save under <code className="rounded bg-zinc-100 px-1 text-xs">.data/drafts/</code>{" "}
            from <span className="font-medium text-zinc-700">Edit draft</span> (dev / self-hosted only — see{" "}
            <span className="font-medium text-zinc-700">docs/admin-authoring.md</span>). Durable / shared drafts
            via DB or GitHub are not implemented yet.
          </p>
        </div>
        <div className={placeholderCard}>
          <p className="font-medium text-zinc-800">Publishing</p>
          <p className="mt-1">Git commits / GitHub API workflow (not implemented).</p>
        </div>
        <div className={placeholderCard}>
          <p className="font-medium text-zinc-800">Preview fidelity</p>
          <p className="mt-1">
            Per-lesson preview exists at{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">
              /admin/offerings/…/lessons/…/preview
            </code>{" "}
            (HTML serialization for admin review). Full-fidelity, production-identical preview is planned — see{" "}
            <span className="font-medium text-zinc-700">docs/admin-authoring.md</span>.
          </p>
        </div>
      </section>
    </main>
  );
}
