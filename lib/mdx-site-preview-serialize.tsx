import type { CompileSitePageMdxParams } from "@/lib/mdx-site-compile";
import { compileSitePageMdx } from "@/lib/mdx-site-compile";

export type SiteMdxPreviewSerialization =
  | { ok: true; html: string }
  | { ok: false; error: string };

/**
 * Admin-only HTML preview for site MDX (same pattern as lesson preview):
 * compile then `renderToString`, loaded dynamically for Turbopack.
 */
export async function serializeSiteMdxPreviewHtml(
  params: CompileSitePageMdxParams
): Promise<SiteMdxPreviewSerialization> {
  try {
    const content = await compileSitePageMdx(params);
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(<div className="site-mdx">{content}</div>);
    return { ok: true, html };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Preview serialization failed: ${msg}`,
    };
  }
}
