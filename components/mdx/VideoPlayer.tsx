/**
 * Hosted video embeds: pick a **provider** per usage (MDX or `ProtectedVideo` registry).
 *
 * - **Vimeo** — convenient for an MVP (simple publishing, familiar tooling). Still a public iframe:
 *   not DRM; optional `privacyHash` only maps to Vimeo’s `h=` param for private/unlisted embeds.
 * - **Cloudflare Stream** — preferred long-term for this stack: signed URLs / token playback and
 *   platform fit (not wired in this repo yet — iframe uses `playbackId` only).
 *
 * Keep both code paths active; do not assume a single provider across the app.
 */
export type VideoPlayerProps =
  | {
      provider: "vimeo";
      videoId: string;
      title?: string;
      /** Reserved for native video later; ignored for iframe embeds. */
      poster?: string;
      /** Vimeo private / unlisted embed hash (`h` query param). */
      privacyHash?: string;
    }
  | {
      provider: "cloudflare";
      playbackId: string;
      title?: string;
      poster?: string;
    };

function cloudflareIframeSrc(playbackId: string): string {
  const customer = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER?.trim();
  if (customer) {
    return `https://${customer}/${playbackId}/iframe`;
  }
  return `https://iframe.videodelivery.net/${playbackId}`;
}

export function VideoPlayer(props: VideoPlayerProps) {
  let iframeSrc: string | null = null;

  if (props.provider === "vimeo") {
    const q = props.privacyHash ? `?h=${encodeURIComponent(props.privacyHash)}` : "";
    iframeSrc = `https://player.vimeo.com/video/${props.videoId}${q}`;
  } else if (props.provider === "cloudflare") {
    const id = props.playbackId.trim();
    if (!id) {
      return (
        <figure className="my-8">
          {props.title ? (
            <figcaption className="mb-2 text-sm font-medium text-zinc-800">{props.title}</figcaption>
          ) : null}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Cloudflare Stream needs a non-empty <code className="font-mono">playbackId</code>. Set it
            on <code className="font-mono">VideoPlayer</code> in MDX, or{" "}
            <code className="font-mono">NEXT_PUBLIC_CLOUDFLARE_DEMO_PLAYBACK_ID</code> for the sample{" "}
            <code className="font-mono">ProtectedVideo</code> mapping.
          </div>
        </figure>
      );
    }
    iframeSrc = cloudflareIframeSrc(id);
  } else {
    const _exhaustive: never = props;
    return _exhaustive;
  }

  const title = props.title ?? "Video";

  return (
    <figure className="my-8">
      {props.title ? (
        <figcaption className="mb-2 text-sm font-medium text-zinc-800">
          {props.title}
        </figcaption>
      ) : null}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
        <iframe
          src={iframeSrc}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </figure>
  );
}
