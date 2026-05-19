/**
 * Normalize lesson MDX into searchable plain text and heading titles.
 * Fenced code blocks: fence lines are removed; inner code stays searchable.
 */

const HEADING_LINE = /^(#{1,6})\s+(.+)$/;

/** Heading lines outside fenced ``` blocks only (not ### inside code samples). */
export function extractMarkdownHeadingsOutsideFences(source: string): string[] {
  const headings: string[] = [];
  const lines = source.split(/\r?\n/);
  let inFence = false;
  for (const line of lines) {
    if (isFenceDelimiterLine(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = HEADING_LINE.exec(line);
    if (m && m[2]) headings.push(m[2].trim());
  }
  return headings;
}

/** Opening/closing line for a fenced ``` block (language/info after backticks, no stray backticks). */
function isFenceDelimiterLine(line: string): boolean {
  return /^(\s*)(`{3,})([^`]*)$/.exec(line) !== null;
}

function unwrapMarkdownLinksAndImages(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

function stripJsxTags(line: string): string {
  return line.replace(/<[^>]+>/g, " ");
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Plain-ish searchable body: strips MDX/MD noise but keeps fenced code inner lines.
 */
export function stripLessonMdxForSearchBody(source: string): string {
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;
  let inDirective = false;

  for (const line of lines) {
    if (isFenceDelimiterLine(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    const trimmedStart = line.trimStart();
    if (trimmedStart.startsWith(":::")) {
      inDirective = !inDirective;
      continue;
    }

    if (inDirective) {
      out.push(line);
      continue;
    }

    const t = line.trim();
    if (/^(import|export)\s/.test(t)) {
      continue;
    }

    let processed = unwrapMarkdownLinksAndImages(line);
    processed = stripJsxTags(processed);
    processed = processed.replace(/^\s*\$\$[\s\S]*?\$\$\s*$/g, " "); // single-line display math only
    processed = processed.replace(/\$([^$\n]+)\$/g, "$1");
    out.push(processed);
  }

  return collapseWhitespace(out.join("\n"));
}
