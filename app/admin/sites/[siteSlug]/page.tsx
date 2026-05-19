import Link from "next/link";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { canAdminAccessSite } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import {
  effectiveSiteVisibility,
  isPublicSite,
  listSitePageSlugs,
  loadSite,
} from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  params: Promise<{ siteSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug } = await params;
  if (!isSafeSlug(siteSlug)) {
    return { title: "Admin · Site" };
  }
  try {
    const s = loadSite(siteSlug);
    return { title: `${s.title} · Admin` };
  } catch {
    return { title: "Admin · Site" };
  }
}

export default async function AdminSiteDetailPage({ params }: Props) {
  const { siteSlug } = await params;

  if (!isSafeSlug(siteSlug)) {
    notFound();
  }

  const email = await getCurrentUserEmail();
  if (!canAdminAccessSite(email, siteSlug)) {
    forbidden();
  }

  let site;
  try {
    site = loadSite(siteSlug);
  } catch {
    notFound();
  }

  const visibility = effectiveSiteVisibility(site);
  const pages = listSitePageSlugs(siteSlug);
  const publicOk = isPublicSite(site);

  return (
    <main>
      <nav className="text-sm text-zinc-600">
        <Link href="/admin/sites" className="hover:text-zinc-900">
          Sites
        </Link>
        <span className="mx-2 text-zinc-400">/</span>
        <span className="text-zinc-900">{site.title}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">{site.title}</h1>
      <p className="mt-1 text-xs text-zinc-500">{siteSlug}</p>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <dt className="text-zinc-500">Visibility</dt>
          <dd className="font-medium text-zinc-800">{visibility}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <dt className="text-zinc-500">Public URL</dt>
          <dd className="font-medium text-zinc-800">
            {publicOk ? (
              <Link href={`/s/${siteSlug}`} className="text-emerald-700 underline-offset-2 hover:underline">
                /s/{siteSlug}
              </Link>
            ) : (
              <span className="text-zinc-500">Not publicly reachable</span>
            )}
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Navigation (site.yaml)</h2>
        {site.navigation.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No nav entries.</p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-800">
            {site.navigation.map((item) => (
              <li key={`${item.page}:${item.title}`}>
                <span className="font-medium">{item.title}</span>{" "}
                <span className="text-zinc-500">
                  (
                  {item.page === "index" ? (
                    <Link href={`/s/${siteSlug}`} className="text-emerald-700 hover:underline">
                      /
                    </Link>
                  ) : (
                    <Link
                      href={`/s/${siteSlug}/${item.page}`}
                      className="text-emerald-700 hover:underline"
                    >
                      /{item.page}
                    </Link>
                  )}
                  )
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Pages on disk</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-800">
          {pages.map((p) => {
            const href =
              p === "index"
                ? publicOk
                  ? `/s/${siteSlug}`
                  : null
                : publicOk
                  ? `/s/${siteSlug}/${p}`
                  : null;
            return (
              <li key={p}>
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">{p}</code>
                {href ? (
                  <>
                    {" "}
                    <Link href={href} className="text-emerald-700 underline-offset-2 hover:underline">
                      View public page
                    </Link>
                  </>
                ) : (
                  <span className="text-zinc-500"> — private site</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-10 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600">
        Editing and preview routes are planned for a later phase; update MDX on disk and redeploy for now.
      </p>
    </main>
  );
}
