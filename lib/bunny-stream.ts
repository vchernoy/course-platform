import { createHash } from "crypto";

/**
 * Bunny Stream embeds with embed-view token authentication (server-side only; never import this
 * from a client component, because it reads the signing key).
 *
 * Token = SHA256_HEX(token_security_key + video_id + expires), expires in Unix seconds, sent as
 * `?token=…&expires=…` on https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}.
 * Docs: https://docs.bunny.net/stream/token-authentication — setup and checks: docs/video-bunny.md.
 *
 * Keys come from server environment variables (Vercel), never from YAML or the repo:
 *   BUNNY_STREAM_TOKEN_KEY_<libraryId>   key for one library (customers can have their own)
 *   BUNNY_STREAM_TOKEN_KEY               fallback for every library
 *   BUNNY_STREAM_TOKEN_TTL_SECONDS       link lifetime, default 21600 (6 h; recordings run up to 4 h)
 */

export const BUNNY_EMBED_HOST = "https://iframe.mediadelivery.net";

/** Library ids are numeric in Bunny. */
export const BUNNY_LIBRARY_ID_RE = /^\d{1,12}$/;
/** Video ids are GUIDs. */
export const BUNNY_VIDEO_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_TOKEN_TTL_SECONDS = 6 * 60 * 60;
const MIN_TTL = 60;
const MAX_TTL = 24 * 60 * 60;

type Env = Record<string, string | undefined>;

export function isValidBunnyLibraryId(id: string): boolean {
  return BUNNY_LIBRARY_ID_RE.test(id);
}

export function isValidBunnyVideoId(id: string): boolean {
  return BUNNY_VIDEO_ID_RE.test(id);
}

/** Hex SHA-256 of key + videoId + expires (Bunny embed view token). */
export function bunnyEmbedToken(tokenKey: string, videoId: string, expires: number): string {
  return createHash("sha256").update(`${tokenKey}${videoId}${expires}`).digest("hex");
}

/** Signing key for a library: per-library variable first, then the shared one. */
export function bunnyTokenKeyFor(libraryId: string, env: Env = process.env): string | undefined {
  const own = env[`BUNNY_STREAM_TOKEN_KEY_${libraryId}`]?.trim();
  if (own) return own;
  const shared = env.BUNNY_STREAM_TOKEN_KEY?.trim();
  return shared || undefined;
}

export function bunnyTokenTtlSeconds(env: Env = process.env): number {
  const raw = Number.parseInt(env.BUNNY_STREAM_TOKEN_TTL_SECONDS ?? "", 10);
  if (!Number.isFinite(raw)) return DEFAULT_TOKEN_TTL_SECONDS;
  return Math.min(MAX_TTL, Math.max(MIN_TTL, raw));
}

export type BunnyEmbed = {
  src: string;
  /** False when no signing key is configured (works only if the library has token auth off). */
  signed: boolean;
  /** Unix seconds when a signed link stops working. */
  expires?: number;
};

/**
 * Embed URL for one video. Throws on ids that are not Bunny's formats, so MDX or YAML can never
 * steer the iframe to another host or path.
 */
export function bunnyEmbedUrl(
  libraryId: string,
  videoId: string,
  opts: { env?: Env; nowMs?: number; sign?: boolean } = {}
): BunnyEmbed {
  if (!isValidBunnyLibraryId(libraryId)) throw new Error(`Invalid Bunny libraryId: ${JSON.stringify(libraryId)}`);
  if (!isValidBunnyVideoId(videoId)) throw new Error(`Invalid Bunny videoId: ${JSON.stringify(videoId)}`);
  const env = opts.env ?? process.env;
  const params = new URLSearchParams({ autoplay: "false", preload: "false", responsive: "true" });
  // Callers pass sign: false when the viewer's customer doesn't own the library.
  const key = opts.sign === false ? undefined : bunnyTokenKeyFor(libraryId, env);
  let expires: number | undefined;
  if (key) {
    expires = Math.floor((opts.nowMs ?? Date.now()) / 1000) + bunnyTokenTtlSeconds(env);
    params.set("token", bunnyEmbedToken(key, videoId, expires));
    params.set("expires", String(expires));
  }
  return {
    src: `${BUNNY_EMBED_HOST}/embed/${libraryId}/${videoId}?${params.toString()}`,
    signed: Boolean(key),
    ...(expires !== undefined ? { expires } : {}),
  };
}
