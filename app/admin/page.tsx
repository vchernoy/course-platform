import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Admin</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600">
        Read-only offering overview. Editing, preview, and Git-backed publishing are planned;
        see docs/admin-authoring.md.
      </p>
      <div className="mt-8">
        <Link
          href="/admin/offerings"
          className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          View offerings
        </Link>
      </div>
    </main>
  );
}
