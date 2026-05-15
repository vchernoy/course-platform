export default function LessonLoading() {
  return (
    <main className="mx-auto max-w-3xl animate-pulse px-6 py-8 lg:py-12">
      <div className="h-4 w-40 rounded bg-zinc-200" />
      <div className="mt-3 h-10 max-w-lg rounded bg-zinc-200" />
      <div className="mt-10 space-y-3">
        <div className="h-4 w-full rounded bg-zinc-200" />
        <div className="h-4 w-full rounded bg-zinc-200" />
        <div className="h-32 w-full rounded-xl bg-zinc-200" />
        <div className="h-4 w-full max-w-md rounded bg-zinc-200" />
      </div>
    </main>
  );
}
