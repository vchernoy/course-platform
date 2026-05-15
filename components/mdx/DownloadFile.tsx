type Props = { assetId: string };

export function DownloadFile({ assetId }: Props) {
  return (
    <div className="my-8 flex flex-col gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-100/80 px-5 py-4">
      <span className="text-sm font-medium text-zinc-900">Download (placeholder)</span>
      <p className="text-xs text-zinc-600">Asset ID: {assetId}</p>
      <button
        type="button"
        disabled
        className="inline-flex w-fit cursor-not-allowed rounded-lg bg-zinc-300 px-4 py-2 text-sm font-medium text-zinc-500"
      >
        Download file — coming soon
      </button>
    </div>
  );
}
