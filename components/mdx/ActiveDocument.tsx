import { renderActive } from "@vchernoy/remark-active";
import { readActiveDocument } from "@/lib/active-document";
import { ActiveDocumentClient } from "./ActiveDocumentClient";

function renderDocument(source: string, preview: boolean) {
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > 64 * 1024) {
    return <aside role="alert">ActiveDocument must contain at most 64 KiB of Markdown.</aside>;
  }
  let rendered: ReturnType<typeof renderActive>;
  try {
    rendered = renderActive(source, { locale: "en-US" });
  } catch {
    return <aside role="alert">ActiveDocument could not render this Markdown.</aside>;
  }
  if (rendered.messages.some(message => message.severity === "error")) {
    return <aside role="alert">ActiveDocument: {rendered.messages.map(message =>
      `${message.line ?? "?"}:${message.column ?? "?"} ${message.message}`).join("; ")}</aside>;
  }
  if (preview) return <section aria-label="Interactive document preview">
    <div className="active-document" dangerouslySetInnerHTML={{ __html: rendered.html }} />
  </section>;
  return <section aria-label="Interactive document"><ActiveDocumentClient html={rendered.html} /></section>;
}

export function createActiveDocument(offeringSlug: string, preview = false) {
  return function ActiveDocument({ source }: { source: string }) {
    let text: string;
    try {
      text = readActiveDocument(offeringSlug, source);
    } catch {
      return <aside role="alert">ActiveDocument could not load. Use an existing .md file under this offering’s ../assets/ directory (maximum 64 KiB, no symlinks).</aside>;
    }
    return renderDocument(text, preview);
  };
}

export function createInlineActiveDocument(preview = false) {
  return function ActiveDocumentInline({ content }: { content: string }) {
    return renderDocument(content, preview);
  };
}
