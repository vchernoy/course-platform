"use client";

export default function OfferingLessonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showDetail = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This lesson could not be loaded. Try again, or return home if the problem persists.
        </p>
        {showDetail ? (
          <p className="mt-4 max-h-32 overflow-auto rounded-md bg-zinc-100 px-3 py-2 text-left font-mono text-xs text-zinc-700">
            {error.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
