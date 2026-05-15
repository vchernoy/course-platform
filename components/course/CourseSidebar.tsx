"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { CourseMeta } from "@/lib/courses";

type Props = {
  course: CourseMeta;
  courseSlug: string;
};

function activeLessonSlug(pathname: string, courseSlug: string): string | null {
  const prefix = `/courses/${courseSlug}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).split("/")[0];
  return rest || null;
}

export function CourseSidebar({ course, courseSlug }: Props) {
  const pathname = usePathname();
  const current = useMemo(
    () => activeLessonSlug(pathname ?? "", courseSlug),
    [pathname, courseSlug]
  );
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="space-y-6 px-4 py-4 lg:px-6 lg:py-8" aria-label="Course lessons">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Course
        </p>
        <p className="mt-1 font-semibold text-zinc-900">{course.title}</p>
      </div>
      {course.modules.map((mod) => (
        <div key={mod.slug}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {mod.title}
          </p>
          <ul className="space-y-0.5 border-l border-zinc-200">
            {mod.lessons.map((les) => {
              const href = `/courses/${courseSlug}/${les.slug}`;
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
        <span className="text-sm font-medium text-zinc-800">Lessons</span>
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
            ? "border-b border-zinc-200 bg-white lg:block lg:w-64 lg:flex-shrink-0 lg:border-b-0 lg:border-r"
            : "hidden border-b border-zinc-200 bg-white lg:block lg:w-64 lg:flex-shrink-0 lg:border-b-0 lg:border-r"
        }
      >
        {nav}
      </aside>
    </>
  );
}
