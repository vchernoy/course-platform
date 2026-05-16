import type { BlockContent, DefinitionContent, PhrasingContent, Root } from "mdast";
import { visit } from "unist-util-visit";

/** Directive names turned into `<Callout type="…">`. */
export const CALLOUT_TYPES = [
  "note",
  "tip",
  "warning",
  "danger",
  "important",
  "exercise",
] as const;

export type CalloutDirectiveType = (typeof CALLOUT_TYPES)[number];

const CALLOUT_SET = new Set<string>(CALLOUT_TYPES);

function plainTextFromPhrasing(nodes: PhrasingContent[]): string {
  let s = "";
  for (const n of nodes) {
    if (n.type === "text") {
      s += n.value;
    } else if ("children" in n && Array.isArray(n.children)) {
      s += plainTextFromPhrasing(n.children as PhrasingContent[]);
    }
  }
  return s.trim();
}

/** `:::warning[Tax]\nBody` stores label in first paragraph with `directiveLabel`. */
function extractDirectiveTitle(children: (BlockContent | DefinitionContent)[]): {
  title: string | undefined;
  body: (BlockContent | DefinitionContent)[];
} {
  const first = children[0];
  if (
    first?.type === "paragraph" &&
    first.data &&
    typeof first.data === "object" &&
    "directiveLabel" in first.data &&
    first.data.directiveLabel === true
  ) {
    const title = plainTextFromPhrasing(first.children);
    return { title: title || undefined, body: children.slice(1) };
  }
  return { title: undefined, body: children };
}

function mdxJsxAttribute(name: string, value: string) {
  return {
    type: "mdxJsxAttribute" as const,
    name,
    value,
  };
}

/**
 * Turns `:::tip` / `:::warning[Title]` blocks into `<Callout>` MDX.
 * Run after `remark-directive`; before `remark-math`.
 */
export function remarkCalloutDirectives() {
  return (tree: Root) => {
    visit(tree, "containerDirective", (node, index, parent) => {
      if (!parent || typeof index !== "number") {
        return;
      }
      if (!CALLOUT_SET.has(node.name)) {
        return;
      }

      const { title, body } = extractDirectiveTitle(node.children);

      const attributes = [mdxJsxAttribute("type", node.name)];
      if (title) {
        attributes.push(mdxJsxAttribute("title", title));
      }

      const jsx = {
        type: "mdxJsxFlowElement" as const,
        name: "Callout",
        attributes,
        children: body,
      };

      parent.children[index] = jsx;
    });
  };
}
