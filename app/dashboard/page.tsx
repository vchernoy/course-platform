import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { getCurrentUserEmail } from "@/lib/authz";
import {
  type OfferingFormat,
  type OfferingMeta,
  getOrderedLessons,
  listOfferingSlugs,
  loadOffering,
} from "@/lib/offerings";
import { emailHasOfferingAccess } from "@/lib/students";

type GroupKey = "courses" | "webinars" | "workshops";

const GROUP_LABELS: Record<GroupKey, string> = {
  courses: "Courses",
  webinars: "Webinars",
  workshops: "Workshops",
};

const GROUP_ORDER: GroupKey[] = ["courses", "webinars", "workshops"];

function formatToGroup(format: OfferingFormat): GroupKey {
  if (format === "course" || format === "mini-course") return "courses";
  if (format === "webinar") return "webinars";
  return "workshops";
}

function formatBadgeLabel(format: OfferingFormat): string {
  if (format === "course" || format === "mini-course") return "Course";
  if (format === "webinar") return "Webinar";
  return "Workshop";
}

function OfferingCard({ slug, offering }: { slug: string; offering: OfferingMeta }) {
  const lessons = getOrderedLessons(offering);
  const lessonCount = lessons.length;
  const href = `/offerings/${slug}`;

  const dateLine = [offering.startDate, offering.endDate].filter(Boolean).join(" → ");

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
              {formatBadgeLabel(offering.format)}
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
              Available
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900">{offering.title}</h3>
            {offering.description ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">
                {offering.description}
              </p>
            ) : null}
            {dateLine ? (
              <p className="mt-2 text-sm text-zinc-600">
                <span className="font-medium text-zinc-700">Dates </span>
                {dateLine}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-zinc-600">
              <span className="font-medium text-zinc-700">Lessons </span>
              {lessonCount === 1 ? "1 lesson" : `${lessonCount} lessons`}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex w-full shrink-0 justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 sm:w-auto sm:self-start"
        >
          Open
        </Link>
      </div>
    </article>
  );
}

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

  const grouped: Record<GroupKey, { slug: string; offering: OfferingMeta }[]> = {
    courses: [],
    webinars: [],
    workshops: [],
  };

  for (const slug of accessible) {
    const offering = loadOffering(slug);
    grouped[formatToGroup(offering.format)].push({ slug, offering });
  }

  return (
    <>
      <PortalHeader email={email} activeNav="dashboard" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="border-b border-zinc-200 pb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Your enrolled offerings and materials. Open a card to continue where you left off.
          </p>
        </div>

        {accessible.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-14 text-center">
            <p className="text-base font-medium text-zinc-900">
              You do not have access to any offerings yet.
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-600">
              Ask your administrator to add your email under{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-zinc-200">
                offerings
              </code>{" "}
              in{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-zinc-200">
                config/students.yaml
              </code>
              .
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {GROUP_ORDER.map((key) => {
              const items = grouped[key];
              if (items.length === 0) return null;
              return (
                <section key={key} aria-labelledby={`group-${key}`}>
                  <h2
                    id={`group-${key}`}
                    className="text-lg font-semibold tracking-tight text-zinc-900"
                  >
                    {GROUP_LABELS[key]}
                  </h2>
                  <ul className="mt-4 space-y-4">
                    {items.map(({ slug, offering }) => (
                      <li key={slug}>
                        <OfferingCard slug={slug} offering={offering} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
