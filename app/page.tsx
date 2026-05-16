import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { HomeSignOutButton } from "@/components/HomeSignOutButton";
import { getCurrentUserEmail } from "@/lib/authz";

function signUpLinkEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_SHOW_SIGN_UP_LINK;
  if (v == null || v === "") return true;
  return v.toLowerCase() !== "false";
}

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Course platform
        </h1>
        <p className="text-zinc-600">Sign in to access your offerings.</p>
        <Link
          href="/sign-in"
          className="inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign in
        </Link>
        {signUpLinkEnabled() ? (
          <p className="text-sm text-zinc-500">
            Need an account?{" "}
            <Link href="/sign-up" className="underline hover:text-zinc-800">
              Sign up
            </Link>
          </p>
        ) : null}
      </main>
    );
  }

  const email = await getCurrentUserEmail();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">Course platform</h1>
      <p className="text-lg font-medium text-zinc-900">Welcome back</p>
      <p className="text-sm text-zinc-600">{email ?? "Signed in"}</p>
      <Link
        href="/dashboard"
        className="inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Dashboard
      </Link>
      <Link
        href="/offerings/investing-basics-2026-05"
        className="inline-flex w-fit rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Open sample offering
      </Link>
      <HomeSignOutButton />
    </main>
  );
}
