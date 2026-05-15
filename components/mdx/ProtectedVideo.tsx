type Props = { assetId: string };

export function ProtectedVideo({ assetId }: Props) {
  return (
    <div className="my-8 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 text-white shadow-sm">
      <div className="flex aspect-video items-center justify-center bg-zinc-800">
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300">
            Protected video
          </span>
          <p className="text-sm text-zinc-400">Asset ID: {assetId}</p>
          <p className="max-w-sm text-xs text-zinc-500">
            Playback would be gated here (signing, tokens, or a provider). This is a
            placeholder only.
          </p>
        </div>
      </div>
    </div>
  );
}
