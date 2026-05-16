import fs from "fs";
import path from "path";
import yaml from "yaml";
import { assertSafeSlug, isSafeSlug } from "@/lib/slug";

const CONTENT_ROOT = path.join(process.cwd(), "content", "courses");

/** One row in `videos.yaml` — matches {@link VideoPlayer} direct props (keep in sync manually). */
export type CourseVideoEntry =
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

export type CourseVideoMap = Record<string, CourseVideoEntry>;

function prefix(msg: string) {
  return `videos.yaml: ${msg}`;
}

function parseOneEntry(assetId: string, raw: unknown): CourseVideoEntry {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix(`videos["${assetId}"] must be an object`));
  }
  const o = raw as Record<string, unknown>;
  const provider = o.provider;

  if (provider === "vimeo") {
    if (typeof o.videoId !== "string" || !o.videoId.trim()) {
      throw new Error(prefix(`videos["${assetId}"].videoId must be a non-empty string`));
    }
    const row: CourseVideoEntry = {
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
    const row: CourseVideoEntry = {
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

/** Validates parsed YAML from `videos.yaml`. */
export function validateVideosContent(raw: unknown): CourseVideoMap {
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
  const out: CourseVideoMap = {};

  for (const assetId of Object.keys(videosObj)) {
    if (!isSafeSlug(assetId)) {
      throw new Error(prefix(`invalid videos key (asset id): ${JSON.stringify(assetId)}`));
    }
    out[assetId] = parseOneEntry(assetId, videosObj[assetId]);
  }

  return out;
}

/**
 * Load `content/courses/<courseSlug>/videos.yaml`.
 * Missing file → empty map. Invalid YAML/shape → throws (caller should treat as notFound).
 */
export function loadCourseVideos(courseSlug: string): CourseVideoMap {
  assertSafeSlug("courseSlug", courseSlug);
  const filePath = path.join(CONTENT_ROOT, courseSlug, "videos.yaml");
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = yaml.parse(fs.readFileSync(filePath, "utf8"));
  return validateVideosContent(raw);
}
