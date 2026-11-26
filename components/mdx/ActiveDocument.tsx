import { renderActive } from "@vchernoy/remark-active";
import { readActiveDocument } from "@/lib/active-document";
import { ActiveDocumentClient } from "./ActiveDocumentClient";

export function createActiveDocument(offeringSlug: string, preview = false) {
  return function ActiveDocument({ source }: { source: string }) {
    let html: string;
    try {
      const rendered = renderActive(readActiveDocument(offeringSlug, source), { locale: "en-US" });
      if (rendered.messages.some(message => message.severity === "error")) {
        return <aside role="alert">ActiveDocument: {rendered.messages.map(message =>
          `${message.line ?? "?"}:${message.column ?? "?"} ${message.message}`).join("; ")}</aside>;
      }
      html = rendered.html;
    } catch {
      return <aside role="alert">ActiveDocument could not load. Use an existing .md file under this offering’s ../assets/ directory (maximum 64 KiB, no symlinks).</aside>;
    }
    if (preview) return <section aria-label="Interactive document preview">
      <p role="note">Static defaults preview. Controls are interactive in the lesson.</p>
      <div className="active-document" inert dangerouslySetInnerHTML={{ __html: html }} />
    </section>;
    return <section aria-label="Interactive document"><ActiveDocumentClient html={html} /></section>;
  };
}
