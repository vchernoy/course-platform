import type { CompileLessonMdxParams } from "@/lib/mdx-lesson-compile";
import { compileLessonMdxContentForHtmlPreview } from "@/lib/mdx-lesson-compile";

export type LessonMdxPreviewSerialization =
  | { ok: true; html: string }
  | { ok: false; error: string };

/**
 * Temporary admin skeleton: static HTML via react-dom/server. Loaded dynamically so Turbopack
 * does not treat `react-dom/server` as part of the shared lesson compile graph.
 */
export async function serializeLessonMdxPreviewHtml(
  params: CompileLessonMdxParams
): Promise<LessonMdxPreviewSerialization> {
  try {
    const content = await compileLessonMdxContentForHtmlPreview(params);
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(<div className="lesson-mdx">{content}</div>);
    return { ok: true, html };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Preview serialization failed: ${msg}`,
    };
  }
}
