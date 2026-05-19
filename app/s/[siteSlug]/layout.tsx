import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicSite, loadSite } from "@/lib/sites";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  children: ReactNode;
  params: Promise<{ siteSlug: string }>;
};

export default async function SiteLayout({ children, params }: Props) {
  const { siteSlug } = await params;

  if (!isSafeSlug(siteSlug)) {
    notFound();
  }

  let site;
  try {
    site = loadSite(siteSlug);
  } catch {
    notFound();
  }

  if (!isPublicSite(site)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href={`/s/${siteSlug}`} className="text-lg font-semibold text-zinc-900 hover:underline">
            {site.title}
          </Link>
          {site.navigation.length > 0 ? (
            <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600">
              {site.navigation.map((item) => {
                const href =
                  item.page === "index" ? `/s/${siteSlug}` : `/s/${siteSlug}/${item.page}`;
                return (
                  <Link key={`${item.page}:${item.title}`} href={href} className="hover:text-zinc-900">
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">{children}</div>
    </div>
  );
}
