import Link from "next/link";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";

type Props = {
  email: string | null | undefined;
  activeNav: "dashboard" | "offering";
};

export function PortalHeader({ email, activeNav }: Props) {
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
          {activeNav === "offering" ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              Dashboard
            </Link>
          ) : (
            <span className="text-sm font-medium text-zinc-500">Dashboard</span>
          )}
          <DashboardSignOutButton />
        </nav>
      </div>
    </header>
  );
}
