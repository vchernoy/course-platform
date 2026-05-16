export default function OfferingShellLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-zinc-50 lg:flex">
      <aside className="hidden border-r border-zinc-200 bg-white lg:block lg:min-h-screen lg:w-64 lg:flex-shrink-0">
        <div className="space-y-4 px-6 py-8">
          <div className="h-3 w-16 rounded bg-zinc-200" />
          <div className="h-5 w-40 rounded bg-zinc-200" />
          <div className="mt-8 h-3 w-24 rounded bg-zinc-200" />
          <div className="space-y-2 border-l border-zinc-200 pl-3">
            <div className="h-4 w-full max-w-[12rem] rounded bg-zinc-200" />
            <div className="h-4 w-full max-w-[10rem] rounded bg-zinc-200" />
            <div className="h-4 w-full max-w-[14rem] rounded bg-zinc-200" />
          </div>
        </div>
      </aside>
      <div className="flex min-h-[50vh] min-w-0 flex-1 flex-col">
        <div className="border-b border-zinc-200 bg-white px-6 py-4 lg:hidden">
          <div className="h-5 w-24 rounded bg-zinc-200" />
        </div>
        <div className="flex-1 px-6 py-10 lg:py-12">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="h-10 max-w-md rounded bg-zinc-200" />
            <div className="h-4 w-full rounded bg-zinc-200" />
            <div className="h-4 w-full rounded bg-zinc-200" />
            <div className="h-4 w-3/4 rounded bg-zinc-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
