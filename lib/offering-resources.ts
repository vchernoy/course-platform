import fs from "fs";
import path from "path";
import yaml from "yaml";
import { assertSafeAssetSegments, assertSafeSlug, isSafeSlug } from "@/lib/slug";

const CONTENT_ROOT = path.join(process.cwd(), "content", "offerings");

function prefix(msg: string) {
  return `resources.yaml: ${msg}`;
}

/** Validated local row: path segments each pass asset-segment rules (not {@link isSafeSlug}). */
export type OfferingLocalResource = {
  type: "local";
  label: string;
  pathSegments: string[];
};

export type OfferingExternalResource = {
  type: "external";
  label: string;
  url: string;
  warning?: string;
};

export type OfferingResourceEntry = OfferingLocalResource | OfferingExternalResource;
export type OfferingResourceMap = Record<string, OfferingResourceEntry>;

function parseLocalPath(fieldLabel: string, rawPath: unknown): string[] {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    throw new Error(prefix(`${fieldLabel} must be a non-empty string`));
  }
  const trimmed = rawPath.trim();
  const segments = trimmed.split("/");
  if (segments.some((s) => s === "")) {
    throw new Error(
      prefix(`${fieldLabel} must not contain empty segments (no // or leading/trailing slashes)`)
    );
  }
  try {
    assertSafeAssetSegments(segments);
  } catch {
    throw new Error(
      prefix(
        `${fieldLabel} has invalid segment(s); use only letters, digits, . _ - per segment; disallow . .. \\ and traversal`
      )
    );
  }
  return segments;
}

function assertSafeExternalUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error();
    }
    return urlStr;
  } catch {
    throw new Error(prefix(`external url must be http(s): ${JSON.stringify(urlStr)}`));
  }
}

function parseOneEntry(assetId: string, raw: unknown): OfferingResourceEntry {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(prefix(`resources["${assetId}"] must be an object`));
  }
  const o = raw as Record<string, unknown>;
  const typ = o.type;
  if (typ !== "local" && typ !== "external") {
    throw new Error(prefix(`resources["${assetId}"].type must be "local" or "external"`));
  }

  if (typeof o.label !== "string" || !o.label.trim()) {
    throw new Error(prefix(`resources["${assetId}"].label must be a non-empty string`));
  }
  const label = o.label.trim();

  if (typ === "local") {
    const pathSegments = parseLocalPath(`resources["${assetId}"].path`, o.path);
    return { type: "local", label, pathSegments };
  }

  if (typeof o.url !== "string" || !o.url.trim()) {
    throw new Error(prefix(`resources["${assetId}"].url must be a non-empty string`));
  }
  const url = assertSafeExternalUrl(o.url.trim());

  let warning: string | undefined;
  if (o.warning !== undefined) {
    if (typeof o.warning !== "string") {
      throw new Error(prefix(`resources["${assetId}"].warning must be a string when set`));
    }
    const w = o.warning.trim();
    if (w) warning = w;
  }

  return { type: "external", label, url, warning };
}

export function validateResourcesContent(raw: unknown): OfferingResourceMap {
  if (raw === null || typeof raw !== "object") {
    throw new Error(prefix("root must be a mapping (object)"));
  }

  const root = raw as Record<string, unknown>;
  if (!("resources" in root)) {
    throw new Error(prefix('"resources" is required'));
  }
  const resRaw = root.resources;
  if (resRaw === null || typeof resRaw !== "object" || Array.isArray(resRaw)) {
    throw new Error(prefix('"resources" must be a mapping (object)'));
  }

  const obj = resRaw as Record<string, unknown>;
  const out: OfferingResourceMap = {};

  for (const assetId of Object.keys(obj)) {
    if (!isSafeSlug(assetId)) {
      throw new Error(prefix(`invalid resources key (asset id): ${JSON.stringify(assetId)}`));
    }
    out[assetId] = parseOneEntry(assetId, obj[assetId]);
  }

  return out;
}

export function loadOfferingResources(offeringSlug: string): OfferingResourceMap {
  assertSafeSlug("offeringSlug", offeringSlug);
  const filePath = path.join(CONTENT_ROOT, offeringSlug, "resources.yaml");
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = yaml.parse(fs.readFileSync(filePath, "utf8"));
  return validateResourcesContent(raw);
}

/**
 * Public URL path for a file under `content/offerings/<slug>/assets/`.
 * Segments must already satisfy {@link isSafeAssetSegment}.
 */
export function localOfferingAssetHref(offeringSlug: string, segments: string[]): string {
  assertSafeSlug("offeringSlug", offeringSlug);
  assertSafeAssetSegments(segments);
  const pathPart = segments.map(encodeURIComponent).join("/");
  return `/api/offering-assets/${offeringSlug}/${pathPart}`;
}
