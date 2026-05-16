import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  type OfferingFormat,
  getOrderedLessons,
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
  try {
    const offering = loadOffering(offeringSlug);
    return { title: `${offering.title} · Overview` };
  } catch {
    return { title: "Offering not found" };
  }
}

export default async function OfferingOverviewPage({ params }: Props) {
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

  const lessons = getOrderedLessons(offering);
  const first = lessons[0];
  const firstLessonHref = first
    ? `/offerings/${offeringSlug}/${first.lessonSlug}`
    : `/offerings/${offeringSlug}/lesson-1`;

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

      <div className="mt-8">
        <Link
          href={firstLessonHref}
          className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          aria-label="Continue to first lesson"
        >
          Open first lesson
        </Link>
      </div>

      <section className="mt-12 border-t border-zinc-200 pt-10">
        <h2 className="text-xl font-semibold text-zinc-900">Modules & lessons</h2>
        <ol className="mt-6 space-y-8">
          {offering.modules.map((mod) => (
            <li key={mod.slug}>
              <p className="font-semibold text-zinc-900">{mod.title}</p>
              <ul className="mt-3 space-y-2 border-l border-zinc-200 pl-4">
                {mod.lessons.map((les) => (
                  <li key={les.slug}>
                    <Link
                      href={`/offerings/${offeringSlug}/${les.slug}`}
                      className="text-sm text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
                    >
                      {les.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 space-y-6 border-t border-zinc-200 pt-10">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Announcements
          </h3>
          <p className="mt-2 text-sm text-zinc-600">No announcements yet.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Resources
          </h3>
          <p className="mt-2 text-sm text-zinc-600">Resources will appear here.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Community
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            Telegram or community link coming soon.
          </p>
        </div>
      </section>
    </main>
  );
}
