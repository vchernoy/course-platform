import { MDXProvider } from "@mdx-js/react";
import { compileMDX, type MDXRemoteProps } from "next-mdx-remote/rsc";
import type { ComponentProps, ImgHTMLAttributes, ReactElement } from "react";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { Anchor } from "@/components/mdx/Anchor";
import { AnchorBlock } from "@/components/mdx/AnchorBlock";
import { Callout } from "@/components/mdx/Callout";
import { Details } from "@/components/mdx/Details";
import { SiteImage } from "@/components/mdx/SiteImage";
import { remarkCalloutDirectives } from "@/lib/mdx-callouts";
import { rewriteSiteAssetUrls } from "@/lib/site-assets";

/** Resolve `](../assets/...` for site MDX (same convention as lesson `../assets/`). */
export function prepareSiteMdxSource(source: string, siteSlug: string): string {
  return rewriteSiteAssetUrls(source, siteSlug);
}

export type CompileSitePageMdxParams = {
  siteSlug: string;
  /** Raw page MDX (passed through {@link prepareSiteMdxSource}). */
  source: string;
};

/**
 * Shared remark/rehype stack with lessons for markdown, math, heading anchors, and callouts.
 * Component map stays public-safe — no offering/video/quiz/course-only MDX tags.
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

function siteMdxComponents(siteSlug: string) {
  return {
    Anchor,
    AnchorBlock,
    Callout,
    Details,
    img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
      <SiteImage
        siteSlug={siteSlug}
        src={typeof props.src === "string" ? props.src : ""}
        alt={props.alt ?? ""}
        className={props.className}
      />
    ),
  };
}

/** Compile site page MDX for `/s/*` (uses {@link SiteImage} + asset URL rewrite). */
export async function compileSitePageMdx(params: CompileSitePageMdxParams): Promise<ReactElement> {
  const { siteSlug, source } = params;
  const mdxSource = prepareSiteMdxSource(source, siteSlug);

  const { content } = await compileMDX({
    source: mdxSource,
    options: siteMdxOptions(),
    components: siteMdxComponents(siteSlug) as ComponentProps<typeof MDXProvider>["components"],
  });
  return content;
}
