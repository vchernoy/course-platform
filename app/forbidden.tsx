import Link from "next/link";
import type { Metadata } from "next";
import { AccessDeniedSignOut } from "@/components/AccessDeniedSignOut";

export const metadata: Metadata = {
  title: "Access denied",
};

export default function Forbidden() {
  const showDevHint = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">
          You do not have access to this offering.
        </h1>
        <p className="mt-3 text-zinc-600">
          If you believe this is a mistake, contact your administrator.
        </p>
        {showDevHint ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Development only: enrollment is controlled by the local allowlist file under{" "}
            <code className="font-mono">config/</code>.
          </p>
        ) : null}
        <AccessDeniedSignOut />
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
