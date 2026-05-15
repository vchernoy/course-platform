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
  let iframeSrc: string;

  if (props.provider === "vimeo") {
    const q = props.privacyHash ? `?h=${encodeURIComponent(props.privacyHash)}` : "";
    iframeSrc = `https://player.vimeo.com/video/${props.videoId}${q}`;
  } else {
    iframeSrc = cloudflareIframeSrc(props.playbackId);
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
