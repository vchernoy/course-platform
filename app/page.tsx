import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Course platform (prototype)
      </h1>
      <p className="text-zinc-600">
        Sample lesson for the investing basics course.
      </p>
      <Link
        href="/courses/investing-basics/lesson-1"
        className="inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Open lesson 1
      </Link>
    </main>
  );
}
