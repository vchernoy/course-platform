import type { ReactNode } from "react";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/admin-auth";
import { getCurrentUserEmail } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const email = await getCurrentUserEmail();
  if (!email) {
    redirect("/sign-in");
  }
  if (!canAccessAdmin(email)) {
    forbidden();
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          <Link href="/admin" className="text-sm font-semibold text-zinc-900">
            Admin
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-zinc-600">
            <Link href="/admin/offerings" className="hover:text-zinc-900">
              Offerings
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-900">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
