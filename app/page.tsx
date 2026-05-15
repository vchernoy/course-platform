import { Show } from "@clerk/nextjs";
import Link from "next/link";

export default async function HomePage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Course platform (prototype)
      </h1>
      <p className="text-zinc-600">
        Sign in to access courses. Enrollment is controlled by{" "}
        <span className="font-mono text-sm">config/students.yaml</span>.
      </p>
      <Show when="signed-out">
        <div className="flex flex-col gap-3">
          <Link
            href="/sign-in"
            className="inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Sign in
          </Link>
          <p className="text-sm text-zinc-500">
            No account yet?{" "}
            <Link href="/sign-up" className="underline hover:text-zinc-800">
              Sign up
            </Link>{" "}
            (or create users in the Clerk dashboard).
          </p>
        </div>
      </Show>
      <Show when="signed-in">
        <Link
          href="/courses/investing-basics/lesson-1"
          className="inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Open lesson 1
        </Link>
      </Show>
    </main>
  );
}
