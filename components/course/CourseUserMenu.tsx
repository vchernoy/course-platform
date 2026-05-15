"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";

export function CourseUserMenu() {
  const { user, isLoaded } = useUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress;

  return (
    <div className="mt-auto border-t border-zinc-200 px-4 py-4 lg:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Signed in
      </p>
      <p className="mt-1 truncate text-sm text-zinc-800">
        {isLoaded ? email ?? "—" : "…"}
      </p>
      <SignOutButton>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}
