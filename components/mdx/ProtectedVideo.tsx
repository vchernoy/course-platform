import type { VideoPlayerProps } from "@/components/mdx/VideoPlayer";
import { VideoPlayer } from "@/components/mdx/VideoPlayer";

type Props = { assetId: string };

/**
 * Back-compat MDX tag: maps assetId → `VideoPlayer` props (public iframe embeds — not DRM).
 * The registry intentionally mixes providers so Vimeo and Cloudflare paths both stay exercised.
 */
const VIDEO_BY_ASSET_ID: Record<string, VideoPlayerProps> = {
  "demo-video-1": {
    provider: "vimeo",
    videoId: "76979871",
    title: "Introduction clip",
  },
  "risk-return-overview": {
    provider: "cloudflare",
    playbackId: process.env.NEXT_PUBLIC_CLOUDFLARE_DEMO_PLAYBACK_ID?.trim() ?? "",
    title: "Risk and return overview",
  },
  "diversification-explainer": {
    provider: "vimeo",
    videoId: "76979871",
    title: "Diversification overview",
  },
};

export function ProtectedVideo({ assetId }: Props) {
  const config = VIDEO_BY_ASSET_ID[assetId];
  if (!config) {
    return (
      <div className="my-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Unknown video <code className="font-mono">{assetId}</code>. Add it to{" "}
        <code className="font-mono">VIDEO_BY_ASSET_ID</code> in ProtectedVideo, or use{" "}
        <code className="font-mono">VideoPlayer</code> in MDX.
      </div>
    );
  }
  return <VideoPlayer {...config} />;
}
