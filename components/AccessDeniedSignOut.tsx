"use client";

import { SignOutButton } from "@clerk/nextjs";

export function AccessDeniedSignOut() {
  return (
    <SignOutButton>
      <button
        type="button"
        className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Sign out
      </button>
    </SignOutButton>
  );
}
