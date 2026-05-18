import type { ReactNode } from "react";
import Link from "next/link";

export default function PublicOfferingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-zinc-900 hover:text-zinc-700">
            Course platform
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
