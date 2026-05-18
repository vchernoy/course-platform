import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  type OfferingFormat,
  effectiveOfferingVisibility,
  isPublicOfferingLanding,
  loadOffering,
} from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ offeringSlug: string }>;
};

function formatBadgeLabel(format: OfferingFormat): string {
  if (format === "course" || format === "mini-course") return "Course";
  if (format === "webinar") return "Webinar";
  return "Workshop";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offeringSlug } = await params;
  if (!isSafeSlug(offeringSlug)) {
    return { title: "Not found" };
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    return { title: "Offering not found" };
  }

  if (!isPublicOfferingLanding(offering)) {
    return { title: "Not found" };
  }

  const visibility = effectiveOfferingVisibility(offering);
  const robots =
    visibility === "unlisted"
      ? ({ index: false, follow: false } satisfies Metadata["robots"])
      : undefined;

  return {
    title: `${offering.title}`,
    description: offering.description,
    robots,
  };
}

export default async function PublicOfferingLandingPage({ params }: Props) {
  const { offeringSlug } = await params;

  if (!isSafeSlug(offeringSlug)) {
    notFound();
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    notFound();
  }

  if (!isPublicOfferingLanding(offering)) {
    notFound();
  }

  const dateLine = [offering.startDate, offering.endDate].filter(Boolean).join(" → ");

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 lg:py-12">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
          {formatBadgeLabel(offering.format)}
        </span>
      </div>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">{offering.title}</h1>

      {dateLine ? (
        <p className="mt-3 text-sm text-zinc-600">
          <span className="font-medium text-zinc-800">Dates </span>
          {dateLine}
        </p>
      ) : null}

      {offering.description ? (
        <p className="mt-4 text-base leading-relaxed text-zinc-700">{offering.description}</p>
      ) : null}

      <section className="mt-12 border-t border-zinc-200 pt-10">
        <h2 className="text-xl font-semibold text-zinc-900">Syllabus</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Outline only — full lessons are available to enrolled students after sign-in.
        </p>
        <ol className="mt-6 space-y-8">
          {offering.modules.map((mod) => (
            <li key={mod.slug}>
              <p className="font-semibold text-zinc-900">{mod.title}</p>
              <ul className="mt-3 space-y-2 border-l border-zinc-200 pl-4">
                {mod.lessons.map((les) => (
                  <li key={les.slug} className="text-sm text-zinc-700">
                    {les.title}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mt-12 space-y-4 border-t border-zinc-200 pt-10"
        aria-labelledby="public-offering-cta-heading"
      >
        <h2 id="public-offering-cta-heading" className="sr-only">
          Enrollment
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed justify-center rounded-lg bg-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-500 ring-1 ring-zinc-300/80"
          >
            Enrollment opens soon
          </button>
          <Link
            href="/sign-in"
            className="inline-flex justify-center text-sm font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline sm:ml-1"
          >
            Already enrolled? Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
