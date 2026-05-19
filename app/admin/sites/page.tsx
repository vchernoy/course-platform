import Link from "next/link";
import type { Metadata } from "next";
import { listAdminAllowedSiteSlugs } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";
import {
  effectiveSiteVisibility,
  isPublicSite,
  listSiteSlugs,
  loadSite,
} from "@/lib/sites";

export const metadata: Metadata = {
  title: "Admin · Sites",
};

export default async function AdminSitesPage() {
  const email = await getCurrentUserEmail();
  const allowedSlugs = listAdminAllowedSiteSlugs(email, listSiteSlugs());
  const rows = allowedSlugs.map((slug) => ({ slug, site: loadSite(slug) }));

  return (
    <main>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Sites</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Filesystem-backed sites under <code className="text-xs">content/sites/</code>. Only sites your admin
        account may access are listed.
      </p>

      <ul className="mt-8 space-y-4">
        {rows.map(({ slug, site: s }) => {
          const visibility = effectiveSiteVisibility(s);
          const publicOk = isPublicSite(s);

          return (
            <li
              key={slug}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">{s.title}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{slug}</p>
                </div>
                <Link
                  href={`/admin/sites/${slug}`}
                  className="text-sm font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
                >
                  Admin detail
                </Link>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Visibility</dt>
                  <dd className="font-medium text-zinc-800">{visibility}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Public /s route</dt>
                  <dd className="font-medium text-zinc-800">
                    {publicOk ? (
                      <Link href={`/s/${slug}`} className="text-emerald-700 underline-offset-2 hover:underline">
                        Open /s/{slug}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">Hidden (private)</span>
                    )}
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">
          No sites in scope. Ask an owner to add <code className="text-xs">sites</code> to your row in{" "}
          <code className="text-xs">config/admins.yaml</code>.
        </p>
      ) : null}
    </main>
  );
}
