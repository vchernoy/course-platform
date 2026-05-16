import type { CourseVideoMap } from "@/lib/course-videos";

/**
 * Direct iframe embed props (Vimeo or Cloudflare Stream). Not DRM — see README.
 *
 * For MDX inside a lesson, the page wraps {@link createLessonVideoPlayer} so you can also pass
 * `{ assetId }` and resolve rows from `content/courses/<slug>/videos.yaml`.
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

/** Props MDX may pass: registry id or full direct {@link VideoPlayerProps}. */
export type VideoPlayerMdxProps = { assetId: string } | VideoPlayerProps;

function cloudflareIframeSrc(playbackId: string): string {
  const customer = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER?.trim();
  if (customer) {
    return `https://${customer}/${playbackId}/iframe`;
  }
  return `https://iframe.videodelivery.net/${playbackId}`;
}

/**
 * Renders a hosted video iframe from explicit provider props (backward compatible with all existing MDX).
 */
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
            Cloudflare Stream needs a non-empty <code className="font-mono">playbackId</code>. Set it in
            MDX (<code className="font-mono">VideoPlayer</code> direct mode) or under{" "}
            <code className="font-mono">videos.yaml</code> for that asset id.
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

/**
 * Use as the MDX `VideoPlayer` component once per lesson render (closes over `videos.yaml` rows).
 */
export function createLessonVideoPlayer(videos: CourseVideoMap) {
  return function VideoPlayerMdx(props: VideoPlayerMdxProps) {
    const maybeAssetId = (props as { assetId?: unknown }).assetId;
    const assetId = typeof maybeAssetId === "string" ? maybeAssetId.trim() : "";

    if (assetId !== "") {
      const row = videos[assetId];
      if (!row) {
        return (
          <div className="my-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Unknown video <code className="font-mono">{assetId}</code>. Add{" "}
            <code className="font-mono">videos.{assetId}</code> in{" "}
            <code className="font-mono">content/courses/&lt;courseSlug&gt;/videos.yaml</code>.
          </div>
        );
      }
      return <VideoPlayer {...row} />;
    }

    return <VideoPlayer {...(props as VideoPlayerProps)} />;
  };
}
