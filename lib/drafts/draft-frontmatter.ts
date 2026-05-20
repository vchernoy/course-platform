import yaml from "yaml";

/** Written to disk — always includes base hash for conflict detection (Phase 3B). */
export type DraftFrontmatterFields = {
  updatedAt: string;
  updatedBy: string;
  baseHash: string;
};

/** Parsed from disk — legacy drafts may omit baseHash until re-saved. */
export type DraftFrontmatterParsed = {
  updatedAt: string;
  updatedBy: string;
  baseHash?: string;
};

/**
 * Strict parse: file must start with `---`, YAML, closing `---`, then the MDX body.
 * Strips one leading newline after the closing `---` (matches {@link serializeDraftMdxFile}).
 */
export function parseDraftMdxFile(raw: string): { meta: DraftFrontmatterParsed; body: string } {
  const text = raw.replace(/^\uFEFF/, "");
  const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const m = text.match(FRONTMATTER_RE);
  if (!m) {
    throw new Error("Draft file must begin with YAML frontmatter delimited by --- lines.");
  }

  const yamlBlock = m[1]!;
  const rawBody = m[2] ?? "";
  const body =
    rawBody.startsWith("\r\n") ? rawBody.slice(2) : rawBody.startsWith("\n") ? rawBody.slice(1) : rawBody;

  let parsed: unknown;
  try {
    parsed = yaml.parse(yamlBlock);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Draft frontmatter YAML parse failed: ${msg}`);
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new Error("Draft frontmatter must be a YAML mapping.");
  }

  const o = parsed as Record<string, unknown>;
  const updatedAt = o.updatedAt;
  const updatedBy = o.updatedBy;
  if (typeof updatedAt !== "string" || !updatedAt.trim()) {
    throw new Error('Draft frontmatter requires non-empty string field "updatedAt".');
  }
  if (typeof updatedBy !== "string" || !updatedBy.trim()) {
    throw new Error('Draft frontmatter requires non-empty string field "updatedBy".');
  }

  const baseHashRaw = o.baseHash;
  const baseHash =
    typeof baseHashRaw === "string" && baseHashRaw.trim() ? baseHashRaw.trim() : undefined;

  const meta: DraftFrontmatterParsed = {
    updatedAt: updatedAt.trim(),
    updatedBy: updatedBy.trim(),
  };
  if (baseHash !== undefined) {
    meta.baseHash = baseHash;
  }

  return { meta, body };
}

export function serializeDraftMdxFile(meta: DraftFrontmatterFields, body: string): string {
  const yamlBlock = yaml
    .stringify({
      updatedAt: meta.updatedAt,
      updatedBy: meta.updatedBy,
      baseHash: meta.baseHash,
    })
    .trimEnd();
  return `---\n${yamlBlock}\n---\n\n${body}`;
}
