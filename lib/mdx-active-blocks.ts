import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

/** Explicit fenced islands avoid interpreting ActiveMD braces as MDX JavaScript. */
export function remarkActiveBlocks() {
  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "active-md" || index === undefined || !parent) return;
      const replacement: MdxJsxFlowElement = {
        type: "mdxJsxFlowElement",
        name: "ActiveDocumentInline",
        attributes: [{ type: "mdxJsxAttribute", name: "content", value: node.value }],
        children: [],
        position: node.position,
      };
      parent.children[index] = replacement;
    });
  };
}
