import fs from "fs";
import path from "path";
import yaml from "yaml";
import { assertSafeSlug, isSafeSlug } from "@/lib/slug";

const CONTENT_ROOT = path.join(process.cwd(), "content", "offerings");

/** Row shape matches {@link VideoPlayer} direct props (keep in sync manually). */
export type OfferingVideoEntry =
  | {
      provider: "vimeo";
      videoId: string;
      title?: string;
      poster?: string;
      privacyHash?: string;
    }
  | {
      provider: "cloudflare";
      playbackId: string;
      title?: string;
      poster?: string;
    };

/** @deprecated use OfferingVideoMap — alias for existing imports */
export type CourseVideoEntry = OfferingVideoEntry;
export type OfferingVideoMap = Record<string, OfferingVideoEntry>;
export type CourseVideoMap = OfferingVideoMap;

function prefix(msg: string) {
  return `videos.yaml: ${msg}`;
}

function parseOneEntry(assetId: string, raw: unknown): OfferingVideoEntry {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix(`videos["${assetId}"] must be an object`));
  }
  const o = raw as Record<string, unknown>;
  const provider = o.provider;

  if (provider === "vimeo") {
    if (typeof o.videoId !== "string" || !o.videoId.trim()) {
      throw new Error(prefix(`videos["${assetId}"].videoId must be a non-empty string`));
    }
    const row: OfferingVideoEntry = {
      provider: "vimeo",
      videoId: o.videoId.trim(),
    };
    if (typeof o.title === "string" && o.title.trim()) row.title = o.title.trim();
    if (typeof o.poster === "string" && o.poster.trim()) row.poster = o.poster.trim();
    if (typeof o.privacyHash === "string" && o.privacyHash.trim()) {
      row.privacyHash = o.privacyHash.trim();
    }
    return row;
  }

  if (provider === "cloudflare") {
    if (typeof o.playbackId !== "string") {
      throw new Error(prefix(`videos["${assetId}"].playbackId must be a string`));
    }
    const row: OfferingVideoEntry = {
      provider: "cloudflare",
      playbackId: o.playbackId,
    };
    if (typeof o.title === "string" && o.title.trim()) row.title = o.title.trim();
    if (typeof o.poster === "string" && o.poster.trim()) row.poster = o.poster.trim();
    return row;
  }

  throw new Error(
    prefix(`videos["${assetId}"].provider must be "vimeo" or "cloudflare"`)
  );
}

export function validateVideosContent(raw: unknown): OfferingVideoMap {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix("root must be a mapping (object)"));
  }

  const root = raw as Record<string, unknown>;
  if (!("videos" in root)) {
    throw new Error(prefix('"videos" is required'));
  }
  const videosRaw = root.videos;
  if (videosRaw === null || typeof videosRaw !== "object" || Array.isArray(videosRaw)) {
    throw new Error(prefix('"videos" must be a mapping (object)'));
  }

  const videosObj = videosRaw as Record<string, unknown>;
  const out: OfferingVideoMap = {};

  for (const assetId of Object.keys(videosObj)) {
    if (!isSafeSlug(assetId)) {
      throw new Error(prefix(`invalid videos key (asset id): ${JSON.stringify(assetId)}`));
    }
    out[assetId] = parseOneEntry(assetId, videosObj[assetId]);
  }

  return out;
}

export function loadOfferingVideos(offeringSlug: string): OfferingVideoMap {
  assertSafeSlug("offeringSlug", offeringSlug);
  const filePath = path.join(CONTENT_ROOT, offeringSlug, "videos.yaml");
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = yaml.parse(fs.readFileSync(filePath, "utf8"));
  return validateVideosContent(raw);
}
