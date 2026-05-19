import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalBreadcrumbs } from "@/components/portal/PortalBreadcrumbs";
import { searchOfferingLessons } from "@/lib/offering-search";
import { loadOffering } from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ offeringSlug: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

function singleQueryParam(v: string | string[] | undefined): string {
  if (v === undefined) return "";
  return typeof v === "string" ? v : v[0] ?? "";
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { offeringSlug } = await params;
  const q = singleQueryParam((await searchParams).q).trim();

  if (!isSafeSlug(offeringSlug)) {
    return { title: "Not found" };
  }
  try {
    const offering = loadOffering(offeringSlug);
    const suffix = q ? ` · "${q}"` : "";
    return { title: `Search${suffix} · ${offering.title}` };
  } catch {
    return { title: "Offering not found" };
  }
}

export default async function OfferingSearchPage({ params, searchParams }: Props) {
  const { offeringSlug } = await params;
  const qRaw = singleQueryParam((await searchParams).q);
  const q = qRaw.trim();

  if (!isSafeSlug(offeringSlug)) {
    notFound();
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    notFound();
  }

  const hits = searchOfferingLessons(offeringSlug, q);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 lg:py-12">
      <PortalBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: offering.title, href: `/offerings/${offeringSlug}` },
          { label: "Search" },
        ]}
      />

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">Search lessons</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Search titles, headings, lesson text, and code samples in this offering.
      </p>

      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
        action={`/offerings/${offeringSlug}/search`}
        method="get"
        role="search"
      >
        <label htmlFor="offering-search-q" className="sr-only">
          Search query
        </label>
        <input
          id="offering-search-q"
          name="q"
          type="search"
          defaultValue={qRaw}
          placeholder="Keywords…"
          autoComplete="off"
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 sm:max-w-md"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 sm:w-auto"
        >
          Search
        </button>
      </form>

      <section className="mt-10 border-t border-zinc-200 pt-8" aria-live="polite">
        {!q ? (
          <p className="text-sm text-zinc-600">Enter a query to search this offering&apos;s lessons.</p>
        ) : hits.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No matches for <span className="font-medium text-zinc-800">&quot;{q}&quot;</span>.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-600">
              {hits.length} result{hits.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-zinc-800">&quot;{q}&quot;</span>
            </p>
            <ol className="mt-6 space-y-4">
              {hits.map((h) => (
                <li key={h.lessonSlug}>
                  <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {h.moduleTitle}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-zinc-900">
                      <Link
                        href={h.url}
                        className="underline-offset-2 hover:text-zinc-700 hover:underline"
                      >
                        {h.lessonTitle}
                      </Link>
                    </h2>
                    <p className="mt-2 font-mono text-xs text-zinc-400">{h.url}</p>
                  </article>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  );
}
