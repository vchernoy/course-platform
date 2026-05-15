import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">Page not found</h1>
        <p className="mt-3 text-zinc-600">
          The page or lesson you requested does not exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Go home
        </Link>
      </main>
    </div>
  );
}
