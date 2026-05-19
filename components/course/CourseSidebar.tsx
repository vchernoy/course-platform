"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { CourseMeta } from "@/lib/offerings";
import { CourseUserMenu } from "@/components/course/CourseUserMenu";

type Props = {
  course: CourseMeta;
  courseSlug: string;
};

function isOfferingOverviewPath(pathname: string, offeringSlug: string): boolean {
  const normalized = (pathname ?? "").replace(/\/+$/, "") || "/";
  return normalized === `/offerings/${offeringSlug}`;
}

function isOfferingSearchPath(pathname: string, offeringSlug: string): boolean {
  const normalized = (pathname ?? "").replace(/\/+$/, "") || "/";
  return normalized === `/offerings/${offeringSlug}/search`;
}

/** First path segment after `/offerings/:slug/`, or null for overview or reserved routes like `search`. */
function activeLessonSlug(pathname: string, offeringSlug: string): string | null {
  const prefix = `/offerings/${offeringSlug}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).split("/")[0];
  if (!rest || rest === "search") return null;
  return rest;
}

export function CourseSidebar({ course, courseSlug }: Props) {
  const pathname = usePathname();
  const current = useMemo(
    () => activeLessonSlug(pathname ?? "", courseSlug),
    [pathname, courseSlug]
  );
  const overviewActive = useMemo(
    () => isOfferingOverviewPath(pathname ?? "", courseSlug),
    [pathname, courseSlug]
  );
  const searchActive = useMemo(
    () => isOfferingSearchPath(pathname ?? "", courseSlug),
    [pathname, courseSlug]
  );
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="space-y-6 px-4 py-4 lg:px-6 lg:py-8" aria-label="Offering navigation">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Course
        </p>
        <p className="mt-1 font-semibold text-zinc-900">{course.title}</p>
      </div>
      <div>
        <ul className="space-y-0.5 border-l border-zinc-200">
          <li>
            <Link
              href={`/offerings/${courseSlug}`}
              onClick={() => setOpen(false)}
              className={
                overviewActive
                  ? "-ml-px block border-l-2 border-zinc-900 py-1.5 pl-3 text-sm font-medium text-zinc-900"
                  : "-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-sm text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }
            >
              Overview
            </Link>
          </li>
          <li>
            <Link
              href={`/offerings/${courseSlug}/search`}
              onClick={() => setOpen(false)}
              className={
                searchActive
                  ? "-ml-px block border-l-2 border-zinc-900 py-1.5 pl-3 text-sm font-medium text-zinc-900"
                  : "-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-sm text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }
            >
              Search
            </Link>
          </li>
        </ul>
        <form
          action={`/offerings/${courseSlug}/search`}
          method="get"
          className="mt-3 flex gap-1.5"
          role="search"
          onSubmit={() => setOpen(false)}
        >
          <label htmlFor={`sidebar-search-${courseSlug}`} className="sr-only">
            Search lessons
          </label>
          <input
            id={`sidebar-search-${courseSlug}`}
            name="q"
            type="search"
            placeholder="Search lessons…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30"
          />
          <button
            type="submit"
            className="flex-shrink-0 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Go
          </button>
        </form>
      </div>
      {course.modules.map((mod) => (
        <div key={mod.slug}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {mod.title}
          </p>
          <ul className="space-y-0.5 border-l border-zinc-200">
            {mod.lessons.map((les) => {
              const href = `/offerings/${courseSlug}/${les.slug}`;
              const active = current === les.slug;
              return (
                <li key={les.slug}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={
                      active
                        ? "-ml-px block border-l-2 border-zinc-900 py-1.5 pl-3 text-sm font-medium text-zinc-900"
                        : "-ml-px block border-l-2 border-transparent py-1.5 pl-3 text-sm text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                    }
                  >
                    {les.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-sm font-medium text-zinc-800">Menu</span>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide menu" : "Show menu"}
        </button>
      </div>
      <aside
        className={
          open
            ? "flex max-h-[min(70vh,28rem)] flex-col border-b border-zinc-200 bg-white lg:max-h-none lg:min-h-screen lg:w-64 lg:flex-shrink-0 lg:border-b-0 lg:border-r"
            : "hidden max-h-[min(70vh,28rem)] flex-col border-b border-zinc-200 bg-white lg:flex lg:max-h-none lg:min-h-screen lg:w-64 lg:flex-shrink-0 lg:border-b-0 lg:border-r"
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
        <CourseUserMenu />
      </aside>
    </>
  );
}
