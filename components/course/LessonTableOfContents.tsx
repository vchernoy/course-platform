import type { LessonTocItem } from "@/lib/mdx-lesson-toc";

type Props = {
  items: LessonTocItem[];
};

export function LessonTableOfContents({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="text-sm text-zinc-600"
    >
      <p className="mb-3 font-semibold uppercase tracking-wide text-zinc-500">On this page</p>
      <ul className="space-y-2 border-l border-zinc-200 pl-3">
        {items.map((item, index) => (
          <li
            key={`toc-${index}-${item.id}`}
            className={item.depth === 3 ? "pl-3" : undefined}
          >
            <a
              href={`#${item.id}`}
              className="block text-zinc-700 underline decoration-zinc-300 underline-offset-[3px] hover:text-zinc-900 hover:decoration-zinc-500 focus-visible:rounded focus-visible:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
