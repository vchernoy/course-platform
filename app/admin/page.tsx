import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Admin</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600">
        Draft editing, preview, and local publish are available for supported offering lessons and site pages.
        Local filesystem publishing (writes under <code className="text-xs">content/</code> from drafts under{" "}
        <code className="text-xs">.data/drafts/</code>) is for development and self-hosted setups only—not typical
        serverless production. Git-backed publishing is planned; see{" "}
        <span className="font-medium text-zinc-800">docs/admin-authoring.md</span>.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/offerings"
          className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          View offerings
        </Link>
        <Link
          href="/admin/sites"
          className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          View sites
        </Link>
      </div>
    </main>
  );
}
