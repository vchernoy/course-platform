import { compile } from "@mdx-js/mdx";
import { toString } from "hast-util-to-string";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";
import { remarkCalloutDirectives } from "@/lib/mdx-callouts";

export type LessonTocItem = {
  depth: 2 | 3;
  id: string;
  text: string;
};

/** Reads h2/h3 ids after the same rehype-slug step used in lesson compilation (TOC-only compile pass). */
function rehypeCaptureLessonToc(items: LessonTocItem[]) {
  return function captureTocPlugin() {
    return function captureTocTree(tree: unknown) {
      visit(tree as any, "element", (node: any) => {
        if (node.tagName !== "h2" && node.tagName !== "h3") return;
        const rawId = node.properties?.id;
        const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? String(rawId[0]) : "";
        if (!id) return;
        items.push({
          depth: node.tagName === "h2" ? 2 : 3,
          id,
          text: toString(node),
        });
      });
    };
  };
}

/**
 * Separate `@mdx-js/mdx` compile (discarded output) through the same public remark/rehype chain as lessons,
 * minus next-mdx-remote sanitizers and autolink — ids should match rendered headings for normal content.
 */
export async function extractLessonTocItems(source: string): Promise<LessonTocItem[]> {
  const items: LessonTocItem[] = [];
  await compile(new VFile(source), {
    remarkPlugins: [remarkDirective, remarkCalloutDirectives, remarkMath],
    rehypePlugins: [rehypeKatex, rehypeSlug, rehypeCaptureLessonToc(items)],
    providerImportSource: undefined,
    outputFormat: "function-body",
    development: process.env.NODE_ENV !== "production",
  });
  return items;
}
