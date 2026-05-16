import Link from "next/link";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";

export function DashboardHeader({ email }: { email: string | null | undefined }) {
  return (
    <header className="border-b border-zinc-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-zinc-700"
          >
            Course Platform
          </Link>
          <span className="truncate text-sm text-zinc-600" title={email ?? undefined}>
            {email ?? "—"}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900 hover:underline"
          >
            Home
          </Link>
          <DashboardSignOutButton />
        </nav>
      </div>
    </header>
  );
}
