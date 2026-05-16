"use client";

import { SignOutButton } from "@clerk/nextjs";

export function DashboardSignOutButton() {
  return (
    <SignOutButton>
      <button
        type="button"
        className="inline-flex shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        Sign out
      </button>
    </SignOutButton>
  );
}
