import Link from "next/link";

export type PortalBreadcrumbItem = { label: string; href?: string };

type Props = {
  items: PortalBreadcrumbItem[];
};

export function PortalBreadcrumbs({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-xs text-zinc-500">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-x-2">
            {i > 0 ? <span className="text-zinc-400 select-none" aria-hidden>/</span> : null}
            {item.href ? (
              <Link
                href={item.href}
                className="truncate underline-offset-2 hover:text-zinc-700 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-zinc-600">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
