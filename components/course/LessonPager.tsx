import Link from "next/link";
import type { LessonNavItem } from "@/lib/offerings";

type Props = {
  courseSlug: string;
  prev: LessonNavItem | null;
  next: LessonNavItem | null;
};

export function LessonPager({ courseSlug, prev, next }: Props) {
  return (
    <nav
      className="mt-12 flex flex-col gap-4 border-t border-zinc-200 pt-8 sm:flex-row sm:justify-between"
      aria-label="Previous and next lesson"
    >
      <div className="min-h-[3rem] flex-1">
        {prev ? (
          <Link
            href={`/offerings/${courseSlug}/${prev.lessonSlug}`}
            className="group inline-flex flex-col rounded-lg border border-transparent px-0 py-1 hover:border-zinc-200 hover:bg-white sm:px-3 sm:py-2"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Previous
            </span>
            <span className="text-sm font-semibold text-zinc-900 group-hover:underline">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-zinc-400">Previous lesson</span>
        )}
      </div>
      <div className="min-h-[3rem] flex-1 text-right">
        {next ? (
          <Link
            href={`/offerings/${courseSlug}/${next.lessonSlug}`}
            className="group inline-flex flex-col items-end rounded-lg border border-transparent px-0 py-1 hover:border-zinc-200 hover:bg-white sm:px-3 sm:py-2"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Next
            </span>
            <span className="text-sm font-semibold text-zinc-900 group-hover:underline">
              {next.title}
            </span>
          </Link>
        ) : (
          <span className="inline-block text-sm text-zinc-400">Next lesson</span>
        )}
      </div>
    </nav>
  );
}
