"use client";

import { SignOutButton } from "@clerk/nextjs";

export function HomeSignOutButton() {
  return (
    <SignOutButton>
      <button
        type="button"
        className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Sign out
      </button>
    </SignOutButton>
  );
}
