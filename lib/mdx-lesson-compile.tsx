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
import { CompoundInterestCalculator } from "@/components/mdx/CompoundInterestCalculator";
import { CourseImage } from "@/components/mdx/CourseImage";
import { Details } from "@/components/mdx/Details";
import { DownloadFile } from "@/components/mdx/DownloadFile";
import { createMdxAnchor } from "@/components/mdx/MdxAnchor";
import { createOfferingResourceLink } from "@/components/mdx/ResourceLink";
import { Quiz } from "@/components/mdx/Quiz";
import { createLessonVideoPlayer } from "@/components/mdx/VideoPlayer";
import { rewriteLessonAssetUrls } from "@/lib/offering-assets";
import { remarkCalloutDirectives } from "@/lib/mdx-callouts";
import type { OfferingResourceMap } from "@/lib/offering-resources";
import type { OfferingVideoMap } from "@/lib/offering-videos";

/** Resolve asset paths for MDX and TOC extraction (same as lesson rendering). */
export function prepareLessonMdxSource(source: string, offeringSlug: string): string {
  return rewriteLessonAssetUrls(source, offeringSlug);
}

export type CompileLessonMdxParams = {
  offeringSlug: string;
  /** Raw lesson MDX (will be passed through {@link prepareLessonMdxSource}). */
  source: string;
  videos: OfferingVideoMap;
  resources: OfferingResourceMap;
};

/**
 * ---------------------------------------------------------------------------
 * Admin HTML preview — `"use client"` MDX components vs server stubs
 * ---------------------------------------------------------------------------
 * `compileLessonMdxContentForHtmlPreview` feeds `react-dom/server` `renderToString`
 * (see `mdx-lesson-preview-serialize.tsx`). Client Components must not be invoked
 * on that path; `lessonMdxComponentsForHtmlPreview` overrides real MDX tags with
 * server-safe placeholders.
 *
 * **Preview-only client component stubs** (keep in sync when the lesson map changes):
 *
 * - **Quiz** → `HtmlPreviewQuizPlaceholder`
 * - **CompoundInterestCalculator** → `HtmlPreviewCompoundInterestPlaceholder`
 *
 * When you add a new `"use client"` component to `lessonMdxComponents`, either:
 *
 * - add a matching server placeholder and override it in `lessonMdxComponentsForHtmlPreview`, or
 * - move preview to a dedicated route / iframe that renders through the normal RSC pipeline
 *   (see `docs/admin-authoring.md`).
 * ---------------------------------------------------------------------------
 */

function lessonMdxOptions(): NonNullable<MDXRemoteProps["options"]> {
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

function HtmlPreviewQuizPlaceholder() {
  return (
    <aside
      className="my-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="note"
    >
      <strong className="font-semibold">Quiz</strong> — not interactive in this admin preview (client-only
      block). Open the published lesson for the full experience.
    </aside>
  );
}

function HtmlPreviewCompoundInterestPlaceholder() {
  return (
    <aside
      className="my-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="note"
    >
      <strong className="font-semibold">Compound interest calculator</strong> — not interactive in this admin
      preview. Open the published lesson to use it.
    </aside>
  );
}

function lessonMdxComponents(
  offeringSlug: string,
  videos: OfferingVideoMap,
  resources: OfferingResourceMap
) {
  const VideoPlayerMdx = createLessonVideoPlayer(videos);
  const ResourceLinkMdx = createOfferingResourceLink(resources, offeringSlug);
  const LessonMdxAnchor = createMdxAnchor(offeringSlug);

  return {
    Anchor,
    AnchorBlock,
    Callout,
    CompoundInterestCalculator,
    CourseImage: (props: { src?: string; alt?: string; className?: string }) => (
      <CourseImage
        courseSlug={offeringSlug}
        src={props.src ?? ""}
        alt={props.alt ?? ""}
        className={props.className}
      />
    ),
    Details,
    img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
      <CourseImage
        courseSlug={offeringSlug}
        src={typeof props.src === "string" ? props.src : ""}
        alt={props.alt ?? ""}
        className={props.className}
      />
    ),
    VideoPlayer: VideoPlayerMdx,
    ResourceLink: ResourceLinkMdx,
    DownloadFile,
    Quiz,
    a: LessonMdxAnchor,
  };
}

/**
 * Same wiring as learner lessons, but swaps client-only interactive blocks for server placeholders so
 * static HTML preview does not invoke Client Components.
 */
function lessonMdxComponentsForHtmlPreview(
  offeringSlug: string,
  videos: OfferingVideoMap,
  resources: OfferingResourceMap
) {
  const base = lessonMdxComponents(offeringSlug, videos, resources);
  return {
    ...base,
    Quiz: HtmlPreviewQuizPlaceholder,
    CompoundInterestCalculator: HtmlPreviewCompoundInterestPlaceholder,
  };
}

/**
 * Compile lesson MDX with the same pipeline as learner lesson pages (remark/rehype + component map).
 */
export async function compileLessonMdxContent(params: CompileLessonMdxParams): Promise<ReactElement> {
  const { offeringSlug, videos, resources } = params;
  const mdxSource = prepareLessonMdxSource(params.source, offeringSlug);

  const { content } = await compileMDX({
    source: mdxSource,
    options: lessonMdxOptions(),
    components: lessonMdxComponents(offeringSlug, videos, resources) as ComponentProps<
      typeof MDXProvider
    >["components"],
  });

  return content;
}

/** Same pipeline as {@link compileLessonMdxContent}, with placeholders for HTML serialization preview. */
export async function compileLessonMdxContentForHtmlPreview(
  params: CompileLessonMdxParams
): Promise<ReactElement> {
  const { offeringSlug, videos, resources } = params;
  const mdxSource = prepareLessonMdxSource(params.source, offeringSlug);

  const { content } = await compileMDX({
    source: mdxSource,
    options: lessonMdxOptions(),
    components: lessonMdxComponentsForHtmlPreview(offeringSlug, videos, resources) as ComponentProps<
      typeof MDXProvider
    >["components"],
  });

  return content;
}
