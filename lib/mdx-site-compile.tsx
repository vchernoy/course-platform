import { MDXProvider } from "@mdx-js/react";
import { compileMDX, type MDXRemoteProps } from "next-mdx-remote/rsc";
import type { ComponentProps, ReactElement } from "react";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { Anchor } from "@/components/mdx/Anchor";
import { AnchorBlock } from "@/components/mdx/AnchorBlock";
import { Callout } from "@/components/mdx/Callout";
import { Details } from "@/components/mdx/Details";
import { remarkCalloutDirectives } from "@/lib/mdx-callouts";

/**
 * Shared remark/rehype stack with lessons for markdown, math, heading anchors, and callouts.
 * Component map is intentionally minimal — no offering/video/quiz/course images (phase 1 sites).
 */
function siteMdxOptions(): NonNullable<MDXRemoteProps["options"]> {
  return {
    mdxOptions: {
      remarkPlugins: [remarkDirective, remarkCalloutDirectives, remarkMath],
      rehypePlugins: [
        rehypeKatex,
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "prepend",
            test: ["h2", "h3"],
            properties: {
              className: ["heading-permalink"],
            },
          },
        ],
      ],
    },
  };
}

const siteMdxComponents = {
  Anchor,
  AnchorBlock,
  Callout,
  Details,
} satisfies ComponentProps<typeof MDXProvider>["components"];

/** Compile site page MDX for public `/s/*` (and admin read-only views later). */
export async function compileSitePageMdx(source: string): Promise<ReactElement> {
  const { content } = await compileMDX({
    source,
    options: siteMdxOptions(),
    components: siteMdxComponents as ComponentProps<typeof MDXProvider>["components"],
  });
  return content;
}
